/**
 * generate-hc-masks-remote.mjs
 *
 * Generates and uploads HC masks for athletes whose images live in Vercel Blob
 * (i.e. athletes stored in Pinecone, not local files in public/assets/athletes/).
 *
 * For each athlete in Pinecone:
 *   1. Check if athletes/hc/{slug}.png already exists in blob (skip if so)
 *   2. Download the athlete image from its blob URL
 *   3. Run AI background removal + invert alpha
 *   4. Upload result to athletes/hc/{slug}.png
 *
 * Usage:
 *   npm run generate:hc-masks:remote
 *   npm run generate:hc-masks:remote -- --force   # re-generate even if mask exists
 *
 * Requires in .env: BLOB_READ_WRITE_TOKEN, PINECONE_API_KEY,
 *                   PINECONE_INDEX_HOST (or PINECONE_INDEX_NAME), PINECONE_NAMESPACE
 */

import removeBackground from '@imgly/background-removal-node'
import sharp from 'sharp'
import { put, list } from '@vercel/blob'
import { Pinecone } from '@pinecone-database/pinecone'
import { pathToFileURL } from 'url'
import { writeFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const FORCE = process.argv.includes('--force')
const HC_BLOB_PREFIX = 'athletes/hc/'
const ATHLETE_RECORD_PREFIX = 'athlete#'

// ── env ──────────────────────────────────────────────────────────────────────

function env(key) {
  return (process.env[key] || '').trim()
}

async function loadEnv() {
  try {
    const { config } = await import('dotenv')
    config()
  } catch { /* dotenv optional */ }
}

// ── Pinecone ─────────────────────────────────────────────────────────────────

async function fetchAllAthletes() {
  const apiKey = env('PINECONE_API_KEY')
  const indexHost = env('PINECONE_INDEX_HOST')
  const indexName = env('PINECONE_INDEX_NAME')
  const namespace = env('PINECONE_NAMESPACE') || 'athletes'

  if (!apiKey || !(indexHost || indexName)) {
    throw new Error('PINECONE_API_KEY and PINECONE_INDEX_HOST (or PINECONE_INDEX_NAME) are required')
  }

  const client = new Pinecone({ apiKey })
  const index = (indexHost ? client.index({ host: indexHost }) : client.index({ name: indexName }))
    .namespace(namespace)

  // List all athlete record IDs
  const ids = []
  let paginationToken
  do {
    const response = await index.listPaginated({ prefix: ATHLETE_RECORD_PREFIX, paginationToken })
    ids.push(...(response.vectors || []).map(v => v.id).filter(Boolean))
    paginationToken = response.pagination?.next
  } while (paginationToken)

  if (!ids.length) return []

  // Fetch in batches of 100 (Pinecone limit)
  const athletes = []
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const response = await index.fetch({ ids: batch })
    const records = response?.records || response?.vectors || {}
    for (const record of Object.values(records)) {
      const data = record.metadata && Object.keys(record.metadata).length ? record.metadata : record
      const slug = String(data.slug || '').trim()
      const image = String(data.image || '').trim()
      if (slug && image && image.startsWith('http')) {
        athletes.push({ slug, image })
      }
    }
  }

  return athletes
}

// ── Blob ─────────────────────────────────────────────────────────────────────

async function getExistingMaskSlugs(token) {
  const existing = new Set()
  let cursor
  do {
    const result = await list({ token, prefix: HC_BLOB_PREFIX, cursor, limit: 1000 })
    for (const blob of result.blobs || []) {
      const slug = blob.pathname.slice(HC_BLOB_PREFIX.length).replace(/\.png$/i, '')
      if (slug) existing.add(slug)
    }
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor)
  return existing
}

// ── Mask generation ───────────────────────────────────────────────────────────

async function generateAndUploadMask(slug, imageUrl, token, tmpDir) {
  // Download image to a temp file (background-removal-node needs a file URL)
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching image`)
  const buffer = Buffer.from(await response.arrayBuffer())

  // Detect extension from Content-Type
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const tmpInput = join(tmpDir, `${slug}.${ext}`)
  await writeFile(tmpInput, buffer)

  // AI background removal
  const fileUrl = pathToFileURL(tmpInput).href
  const resultBlob = await removeBackground(fileUrl, { model: 'small' })
  const resultBuffer = Buffer.from(await resultBlob.arrayBuffer())

  // Extract alpha, invert: player→transparent, background→opaque
  const { data, info } = await sharp(resultBuffer)
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

  // Upload to blob
  const result = await put(`${HC_BLOB_PREFIX}${slug}.png`, maskBuffer, {
    access: 'public',
    addRandomSuffix: false,
    token,
    contentType: 'image/png',
  })

  // Cleanup temp file
  await unlink(tmpInput).catch(() => {})

  return result.url
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await loadEnv()

  const token = env('BLOB_READ_WRITE_TOKEN')
  if (!token) {
    console.error('Error: BLOB_READ_WRITE_TOKEN is not set.')
    process.exit(1)
  }

  console.log('Fetching athletes from Pinecone...')
  const athletes = await fetchAllAthletes()
  console.log(`Found ${athletes.length} athletes with image URLs`)

  console.log('Checking existing HC masks in blob...')
  const existing = FORCE ? new Set() : await getExistingMaskSlugs(token)
  console.log(FORCE ? 'Force mode: regenerating all' : `Already have masks for: ${existing.size}`)

  const pending = athletes.filter(a => !existing.has(a.slug))
  console.log(`Need to generate: ${pending.length}\n`)

  if (!pending.length) {
    console.log('All athletes already have masks.')
    return
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'hc-masks-'))
  let done = 0, failed = 0

  for (const { slug, image } of pending) {
    process.stdout.write(`  [${done + failed + 1}/${pending.length}] ${slug}... `)
    try {
      const url = await generateAndUploadMask(slug, image, token, tmpDir)
      console.log(`done → ${url}`)
      done++
    } catch (err) {
      console.log(`FAILED: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone — ${done} generated, ${failed} failed`)
}

main().catch(err => { console.error(err); process.exit(1) })
