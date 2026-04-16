/**
 * run-clipdrop-single.mjs
 *
 * Generates an HC mask for a single athlete.
 *
 * If --local is passed (or image is a local file path), runs background removal
 * locally via @imgly/background-removal-node and uploads to Vercel Blob.
 *
 * Otherwise, calls the deployed /api/admin/generate-hc-mask endpoint so the
 * server fetches the blob image directly (avoids bot-protection on CDN URLs).
 *
 * Usage:
 *   node scripts/run-clipdrop-single.mjs --slug baker-mayfield --image https://...
 *   node scripts/run-clipdrop-single.mjs --slug aaron-judge --image /tmp/file.jpg
 *   node scripts/run-clipdrop-single.mjs --slug baker-mayfield --image https://... --local
 */

import removeBackground from '@imgly/background-removal-node'
import sharp from 'sharp'
import { put } from '@vercel/blob'
import { readFile, writeFile, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { pathToFileURL } from 'url'

async function loadEnv() {
  try {
    const { config } = await import('dotenv')
    config()
  } catch { /* dotenv optional */ }
}

function arg(name) {
  const idx = process.argv.indexOf(name)
  return idx !== -1 ? process.argv[idx + 1] : null
}

function env(key) {
  return (process.env[key] || '').trim()
}

async function removeBgLocal(imageUrl, tmpDir) {
  let tmpInput

  if (imageUrl.startsWith('/')) {
    // Already a local path — use directly
    tmpInput = imageUrl
  } else {
    // Fetch remote image to a temp file (background-removal-node needs a file URL)
    // Try unauthenticated first; fall back to blob token on 403
    let imageResponse = await fetch(imageUrl)
    if (imageResponse.status === 403) {
      const blobToken = env('BLOB_READ_WRITE_TOKEN')
      imageResponse = await fetch(imageUrl, { headers: { Authorization: `Bearer ${blobToken}` } })
    }
    if (!imageResponse.ok) throw new Error(`Could not fetch image: ${imageResponse.status} ${imageUrl}`)
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    tmpInput = join(tmpDir, `input.${ext}`)
    await writeFile(tmpInput, imageBuffer)
  }

  const fileUrl = pathToFileURL(tmpInput).href
  const resultBlob = await removeBackground(fileUrl, { model: 'small' })
  return Buffer.from(await resultBlob.arrayBuffer())
}

async function main() {
  await loadEnv()

  const slug = arg('--slug')
  if (!slug) {
    console.error('Error: --slug is required (e.g. --slug aaron-judge)')
    process.exit(1)
  }

  const defaultImageUrl = `https://www.gloryandgame.com/assets/athletes/${slug}.jpg`
  const imageUrl = arg('--image') || defaultImageUrl

  const blobToken = env('BLOB_READ_WRITE_TOKEN')
  if (!blobToken) { console.error('Error: BLOB_READ_WRITE_TOKEN not set'); process.exit(1) }

  console.log(`Slug:      ${slug}`)
  console.log(`Image URL: ${imageUrl}`)
  console.log()

  const tmpDir = await mkdtemp(join(tmpdir(), 'hc-mask-'))

  process.stdout.write('Step 1: Removing background (local AI)... ')
  const removedBuffer = await removeBgLocal(imageUrl, tmpDir)
  console.log(`done (${Math.round(removedBuffer.length / 1024)}KB)`)

  process.stdout.write('Step 2: Inverting alpha to create HC mask... ')
  const { data, info } = await sharp(removedBuffer)
    .resize(800, 1120, { fit: 'cover', position: 'top' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < info.width * info.height; i++) {
    const p = i * 4
    rgba[p] = rgba[p + 1] = rgba[p + 2] = 255
    rgba[p + 3] = 255 - data[p + 3]
  }

  const maskBuffer = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(1.5)
    .png({ compressionLevel: 8 })
    .toBuffer()
  console.log(`done (${Math.round(maskBuffer.length / 1024)}KB)`)

  process.stdout.write('Step 3: Uploading HC mask to Vercel Blob... ')
  const blob = await put(`athletes/hc/${slug}.png`, maskBuffer, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: blobToken,
    contentType: 'image/png',
  })
  console.log(`done`)
  console.log()
  console.log(`HC mask URL: ${blob.url}`)
}

main().catch(err => { console.error(err); process.exit(1) })
