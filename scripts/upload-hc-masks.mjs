/**
 * upload-hc-masks.mjs
 *
 * Uploads all existing {slug}-hc.png files from public/assets/athletes/
 * to Vercel Blob at athletes/hc/{slug}.png (stable pathname, no random suffix).
 *
 * This is the companion to generate-hc-masks.mjs — run it once to seed the
 * blob store, or after generating new masks locally.
 *
 * Usage:
 *   npm run upload:hc-masks
 *   npm run upload:hc-masks -- --force   # re-upload even if already present
 *
 * Requires BLOB_READ_WRITE_TOKEN in the environment (or .env file).
 */

import { put, list } from '@vercel/blob'
import { readdir, readFile } from 'fs/promises'
import { join, basename, extname } from 'path'

const ATHLETES_DIR = 'public/assets/athletes'
const BLOB_PREFIX = 'athletes/hc/'
const FORCE = process.argv.includes('--force')

function getToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('Error: BLOB_READ_WRITE_TOKEN is not set.')
    console.error('Add it to your .env file or export it before running this script.')
    process.exit(1)
  }
  return token
}

async function getExistingBlobSlugs(token) {
  const existing = new Set()
  let cursor

  do {
    const result = await list({ token, prefix: BLOB_PREFIX, cursor, limit: 1000 })
    for (const blob of result.blobs || []) {
      const filename = blob.pathname.slice(BLOB_PREFIX.length)
      const slug = filename.replace(/\.png$/i, '')
      if (slug) existing.add(slug)
    }
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor)

  return existing
}

async function main() {
  // Load .env if present
  try {
    const { config } = await import('dotenv')
    config()
  } catch {
    // dotenv not installed — rely on shell env
  }

  const token = getToken()

  const files = await readdir(ATHLETES_DIR)
  const masks = files.filter(f => f.endsWith('-hc.png'))

  if (!masks.length) {
    console.log('No -hc.png files found in public/assets/athletes/.')
    console.log('Run `npm run generate:hc-masks` first.')
    process.exit(0)
  }

  console.log(`Found ${masks.length} mask file(s)`)

  const existing = FORCE ? new Set() : await getExistingBlobSlugs(token)
  console.log(FORCE ? 'Force mode: re-uploading all' : `Already in blob: ${existing.size}`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const file of masks) {
    const slug = basename(file, extname(file)).replace(/-hc$/, '')
    const blobPath = `${BLOB_PREFIX}${slug}.png`

    if (!FORCE && existing.has(slug)) {
      skipped++
      continue
    }

    try {
      process.stdout.write(`  ${slug}... `)
      const buffer = await readFile(join(ATHLETES_DIR, file))
      await put(blobPath, buffer, {
        access: 'public',
        addRandomSuffix: false,
        token,
        contentType: 'image/png',
      })
      console.log('uploaded')
      uploaded++
    } catch (err) {
      console.log(`FAILED: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone — ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`)
}

main().catch(err => { console.error(err); process.exit(1) })
