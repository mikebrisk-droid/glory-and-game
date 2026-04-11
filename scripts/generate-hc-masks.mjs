/**
 * generate-hc-masks.mjs
 *
 * Generates a subject-segmentation mask for every athlete photo using
 * AI background removal (@imgly/background-removal-node). The mask is used
 * by the Classic Holo card design as a CSS mask-image on the shine/sparkle
 * layers so holo effects appear in the background without washing out the player.
 *
 * The output PNG has:
 *   - Player/subject area → opaque white (alpha=255) → holo shows ON player
 *   - Background area     → transparent (alpha=0)    → holo hidden → background stays clean
 *
 * Usage:
 *   node scripts/generate-hc-masks.mjs
 *   node scripts/generate-hc-masks.mjs --force            # regenerate all, even existing
 *   node scripts/generate-hc-masks.mjs --upload           # generate missing + upload to Vercel Blob
 *   node scripts/generate-hc-masks.mjs --force --upload   # regenerate all + upload to Vercel Blob
 */

import removeBackground from '@imgly/background-removal-node'
import sharp from 'sharp'
import { readdir, access, readFile } from 'fs/promises'
import { join, basename, extname, resolve } from 'path'
import { pathToFileURL } from 'url'

const ATHLETES_DIR = 'public/assets/athletes'
const FORCE = process.argv.includes('--force')
const UPLOAD = process.argv.includes('--upload')
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

async function exists(path) {
  try { await access(path); return true } catch { return false }
}

async function generateMask(inputPath, outputPath) {
  // Step 1: AI background removal → player=opaque, background=transparent
  const fileUrl = pathToFileURL(resolve(inputPath)).href
  const resultBlob = await removeBackground(fileUrl, { model: 'small' })
  const resultBuffer = Buffer.from(await resultBlob.arrayBuffer())

  // Step 2: Extract the alpha channel and INVERT it:
  //   player pixels (alpha=255) → 0   (transparent in mask → holo hidden → player clean)
  //   background (alpha=0)      → 255 (opaque in mask → holo shows → background gets rainbow)
  const { data, info } = await sharp(resultBuffer)
    .resize(800, 1120, { fit: 'cover', position: 'top' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < info.width * info.height; i++) {
    const src = i * 4
    const dst = i * 4
    rgba[dst] = rgba[dst + 1] = rgba[dst + 2] = 255      // white
    rgba[dst + 3] = 255 - data[src + 3]                     // player→transparent (holo hidden), bg→opaque (holo on background)
  }

  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(1.5)  // soften mask edges slightly
    .png({ compressionLevel: 8 })
    .toFile(outputPath)
}

async function uploadToBlob(slug, outputPath) {
  let put
  try {
    ;({ put } = await import('@vercel/blob'))
  } catch {
    throw new Error('@vercel/blob is not installed')
  }

  // Load .env if available
  try {
    const { config } = await import('dotenv')
    config()
  } catch { /* dotenv optional */ }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not set')

  const buffer = await readFile(outputPath)
  const blob = await put(`athletes/hc/${slug}.png`, buffer, {
    access: 'public',
    addRandomSuffix: false,
    token,
    contentType: 'image/png',
  })
  return blob.url
}

async function main() {
  const files = await readdir(ATHLETES_DIR)
  const images = files.filter(f => {
    const ext = extname(f).toLowerCase()
    return EXTENSIONS.has(ext) && !f.includes('-hc')
  })

  console.log(`Found ${images.length} athlete images`)

  let generated = 0
  let skipped = 0
  let failed = 0

  for (const file of images) {
    const slug = basename(file, extname(file))
    const inputPath = join(ATHLETES_DIR, file)
    const outputPath = join(ATHLETES_DIR, `${slug}-hc.png`)

    const alreadyExists = await exists(outputPath)

    if (!FORCE && alreadyExists) {
      if (UPLOAD) {
        // Already generated locally — just upload
        try {
          process.stdout.write(`  ${slug} (upload only)... `)
          const url = await uploadToBlob(slug, outputPath)
          console.log(`uploaded → ${url}`)
        } catch (err) {
          console.log(`UPLOAD FAILED: ${err.message}`)
        }
      }
      skipped++
      continue
    }

    try {
      process.stdout.write(`  ${slug}... `)
      await generateMask(inputPath, outputPath)
      generated++

      if (UPLOAD) {
        try {
          const url = await uploadToBlob(slug, outputPath)
          console.log(`done + uploaded → ${url}`)
        } catch (err) {
          console.log(`done (upload failed: ${err.message})`)
        }
      } else {
        console.log('done')
      }
    } catch (err) {
      console.log(`FAILED: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone — ${generated} generated, ${skipped} skipped, ${failed} failed`)
  if (generated > 0 && !UPLOAD) {
    console.log('Run `npm run upload:hc-masks` to push these to Vercel Blob.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
