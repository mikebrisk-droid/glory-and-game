/**
 * HC Mask Studio v2 — local dev server
 * npm run hc-studio → http://localhost:4242
 */

import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { removeBackground, segmentForeground } from '@imgly/background-removal-node'
import { put } from '@vercel/blob'
import { writeFile, unlink, mkdtemp } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'
import { createServer } from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 4242

function env(key) { return (process.env[key] || '').trim() }

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } })

// ── Static ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.sendFile(join(__dirname, 'index.html')))

app.get('/api/config', (req, res) => {
  res.json({ hasBlob: Boolean(env('BLOB_READ_WRITE_TOKEN')) })
})

// ── Process (SSE stream) ──────────────────────────────────────────────────────

app.post('/api/process', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' })

  // Open SSE stream immediately so progress flows before heavy work starts
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (data) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  const {
    blur = '0.5',
    width = '800',
    height = '1120',
    fit = 'cover',
    position = 'top',
    model = 'small',
    invert = 'true',
    threshold = '60',  // 0–128: clip soft alpha edges
    gamma = '1.5',     // 0.5–2.5: curve alpha confidence
    outputMode = 'mask', // 'mask' | 'cutout' | 'segment'
    format = 'png',    // 'png' | 'webp'
    quality = '85',    // WEBP quality 50–100
  } = req.body

  const tmpDir = await mkdtemp(join(tmpdir(), 'hc-studio-'))
  const ext = req.file.mimetype.includes('png') ? 'png'
    : req.file.mimetype.includes('webp') ? 'webp' : 'jpg'
  const tmpInput = join(tmpDir, `input.${ext}`)

  try {
    // Auto-orient based on EXIF so AI sees the correctly-rotated image
    const orientedBuffer = await sharp(req.file.buffer).rotate().toBuffer()
    await writeFile(tmpInput, orientedBuffer)
    const fileUrl = pathToFileURL(tmpInput).href

    // Read EXIF-corrected dimensions (rotate() applies orientation before reporting size)
    const originalMeta = await sharp(req.file.buffer).rotate().metadata()

    // ── Step 1: AI background removal ──
    send({ type: 'stage', label: 'Running AI segmentation…', step: 1, total: 3 })

    const fn = outputMode === 'segment' ? segmentForeground : removeBackground
    const resultBlob = await fn(fileUrl, {
      model,
      progress: (key, current, total) => {
        const label = friendlyKey(key)
        send({ type: 'progress', label, current, total, key })
      },
    })

    const removedBuffer = Buffer.from(await resultBlob.arrayBuffer())

    // ── Step 2: Resize + alpha processing ──
    send({ type: 'stage', label: 'Processing alpha channel…', step: 2, total: 3 })

    const wExplicit = parseInt(width) || 0
    const hExplicit = parseInt(height) || 0
    const explicitResize = wExplicit > 0 && hExplicit > 0
    // Always resize: use specified dims, or fall back to original image dims
    const targetW = wExplicit || originalMeta.width
    const targetH = hExplicit || originalMeta.height
    const blurVal = parseFloat(blur) || 0
    const thresholdVal = Math.max(0, Math.min(128, parseInt(threshold) || 0))
    const gammaVal = Math.max(0.1, Math.min(5.0, parseFloat(gamma) || 1.0))
    const shouldInvert = invert === 'true'

    // When using original size, use 'fill' so we get exact pixel dimensions without cropping
    const resizeFit = explicitResize ? fit : 'fill'
    const resizePosition = explicitResize ? position : 'center'
    const resizeOpts = { fit: resizeFit, position: resizePosition }

    let maskBuffer
    let resultW = targetW
    let resultH = targetH
    const qualityVal = Math.max(50, Math.min(100, parseInt(quality) || 85))
    const encodeOutput = (pipeline) => format === 'webp'
      ? pipeline.webp({ quality: qualityVal, alphaQuality: qualityVal })
      : pipeline.png({ compressionLevel: 8 })

    if (outputMode === 'cutout') {
      // ── Cutout mode: original colours + AI alpha ──────────────────
      // removeBackground returns original pixel colours with transparent background.
      // We read it as raw RGBA, apply threshold/gamma to the alpha channel only,
      // and re-emit with original RGB intact.
      const { data, info } = await sharp(removedBuffer)
        .resize(targetW, targetH, resizeOpts)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      resultW = info.width
      resultH = info.height
      const nPx = resultW * resultH
      const cutoutBuf = Buffer.alloc(nPx * 4)

      for (let i = 0; i < nPx; i++) {
        const p = i * 4
        let a = data[p + 3]
        if (thresholdVal > 0) {
          if (a <= thresholdVal) a = 0
          else if (a >= 255 - thresholdVal) a = 255
          else a = Math.round(((a - thresholdVal) / (255 - 2 * thresholdVal)) * 255)
        }
        if (gammaVal !== 1.0) a = Math.round(255 * Math.pow(a / 255, 1 / gammaVal))
        cutoutBuf[p]     = data[p]       // R — original colour from removeBackground
        cutoutBuf[p + 1] = data[p + 1]   // G
        cutoutBuf[p + 2] = data[p + 2]   // B
        cutoutBuf[p + 3] = Math.max(0, Math.min(255, a))
      }

      let cutoutPipeline = sharp(cutoutBuf, { raw: { width: resultW, height: resultH, channels: 4 } })
      if (blurVal > 0) cutoutPipeline = cutoutPipeline.blur(blurVal)
      maskBuffer = await encodeOutput(cutoutPipeline).toBuffer()

    } else {
      // ── HC mask / segment mode ────────────────────────────────────
      const { data, info } = await sharp(removedBuffer)
        .resize(targetW, targetH, resizeOpts)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      resultW = info.width
      resultH = info.height
      const rgba = Buffer.alloc(resultW * resultH * 4)

      for (let i = 0; i < resultW * resultH; i++) {
        const p = i * 4
        let a = data[p + 3]
        if (thresholdVal > 0) {
          if (a <= thresholdVal) a = 0
          else if (a >= 255 - thresholdVal) a = 255
          else a = Math.round(((a - thresholdVal) / (255 - 2 * thresholdVal)) * 255)
        }
        if (gammaVal !== 1.0) a = Math.round(255 * Math.pow(a / 255, 1 / gammaVal))
        if (shouldInvert) a = 255 - a
        rgba[p]     = 255
        rgba[p + 1] = 255
        rgba[p + 2] = 255
        rgba[p + 3] = Math.max(0, Math.min(255, a))
      }

      let blurPipeline = sharp(rgba, { raw: { width: resultW, height: resultH, channels: 4 } })
      if (blurVal > 0) blurPipeline = blurPipeline.blur(blurVal)
      maskBuffer = await encodeOutput(blurPipeline).toBuffer()
    }

    // ── Step 3: Done ──
    send({ type: 'stage', label: 'Done!', step: 3, total: 3 })
    send({
      type: 'result',
      mask: `data:image/${format === 'webp' ? 'webp' : 'png'};base64,${maskBuffer.toString('base64')}`,
      size: maskBuffer.length,
      width: resultW,
      height: resultH,
    })
  } catch (err) {
    console.error(err)
    send({ type: 'error', message: err.message })
  } finally {
    res.end()
    await unlink(tmpInput).catch(() => {})
  }
})

// ── Upload to Vercel Blob ─────────────────────────────────────────────────────

app.post('/api/upload', express.json({ limit: '15mb' }), async (req, res) => {
  const { slug, maskDataUrl } = req.body || {}
  if (!slug || !maskDataUrl) return res.status(400).json({ error: 'slug and maskDataUrl required.' })

  const token = env('BLOB_READ_WRITE_TOKEN')
  if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured.' })

  try {
    const base64 = maskDataUrl.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const blob = await put(`athletes/hc/${slug}.png`, buffer, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
      contentType: 'image/png',
    })
    res.json({ url: blob.url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function friendlyKey(key) {
  if (!key) return 'Processing…'
  if (key.includes('fetch') || key.includes('load')) return 'Loading model…'
  if (key.includes('inference') || key.includes('compute')) return 'Running inference…'
  if (key.includes('decode') || key.includes('encode')) return 'Encoding result…'
  if (key.includes('init') || key.includes('session')) return 'Initialising AI…'
  return key.replace(/[:_/-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Start ─────────────────────────────────────────────────────────────────────

createServer(app).listen(PORT, () => {
  console.log(`\n  HC Mask Studio v2\n  → http://localhost:${PORT}\n`)
})
