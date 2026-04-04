import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Pinecone } from '@pinecone-database/pinecone'
import { put } from '@vercel/blob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const DEFAULT_IMAGE_PATH = '/assets/athletes/default-athlete.jpg'
const DEFAULT_VERSE = 'Colossians 3:23-24'

function requireEnv(key) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['".,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function guessContentType(filename) {
  if (filename.endsWith('.png')) return 'image/png'
  if (filename.endsWith('.webp')) return 'image/webp'
  if (filename.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

async function loadSeedAthletes() {
  const filePath = path.join(projectRoot, 'src', 'data', 'athletes.json')
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function uploadLocalImage(blobToken, assetPath) {
  const normalizedAssetPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath
  const fullPath = path.join(projectRoot, 'public', normalizedAssetPath)
  const fileBuffer = await readFile(fullPath)
  const filename = path.basename(fullPath)

  const result = await put(`seed-athletes/${filename}`, fileBuffer, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: guessContentType(filename),
    token: blobToken,
  })

  return result.url
}

function athleteToRecord(athlete) {
  return {
    id: `athlete#${athlete.slug}`,
    chunk_text: [athlete.name, athlete.sport, athlete.team, athlete.bio, athlete.verse].filter(Boolean).join('\n'),
    slug: athlete.slug,
    name: athlete.name,
    sport: athlete.sport,
    team: athlete.team,
    verse: athlete.verse,
    bio: athlete.bio,
    image: athlete.image,
    featured: Boolean(athlete.featured),
    isNew: Boolean(athlete.isNew),
    submittedBy: athlete.submittedBy,
    source: athlete.source,
    submittedAt: athlete.submittedAt,
    moderationStatus: athlete.moderationStatus,
    moderationNotes: athlete.moderationNotes,
    reviewedAt: athlete.reviewedAt,
    reviewedBy: athlete.reviewedBy,
  }
}

async function main() {
  const pineconeApiKey = requireEnv('PINECONE_API_KEY')
  const pineconeNamespace = process.env.PINECONE_NAMESPACE || 'athletes'
  const pineconeIndexHost = process.env.PINECONE_INDEX_HOST
  const pineconeIndexName = process.env.PINECONE_INDEX_NAME
  const blobToken = requireEnv('BLOB_READ_WRITE_TOKEN')

  if (!pineconeIndexHost && !pineconeIndexName) {
    throw new Error('Set either PINECONE_INDEX_HOST or PINECONE_INDEX_NAME before importing.')
  }

  const seedAthletes = await loadSeedAthletes()
  const pinecone = new Pinecone({ apiKey: pineconeApiKey })
  const index = pineconeIndexHost
    ? pinecone.index({ host: pineconeIndexHost }).namespace(pineconeNamespace)
    : pinecone.index({ name: pineconeIndexName }).namespace(pineconeNamespace)

  const uploadedImages = new Map()

  async function resolveImageUrl(assetPath) {
    const wantedPath = assetPath || DEFAULT_IMAGE_PATH
    if (uploadedImages.has(wantedPath)) return uploadedImages.get(wantedPath)
    const blobUrl = await uploadLocalImage(blobToken, wantedPath)
    uploadedImages.set(wantedPath, blobUrl)
    return blobUrl
  }

  const records = []

  for (const rawAthlete of seedAthletes) {
    const image = await resolveImageUrl(rawAthlete.image || DEFAULT_IMAGE_PATH)
    records.push(
      athleteToRecord({
        slug: String(rawAthlete.slug || slugify(rawAthlete.name)).trim(),
        name: String(rawAthlete.name || '').trim(),
        sport: String(rawAthlete.sport || '').trim(),
        team: String(rawAthlete.team || '').trim(),
        featured: Boolean(rawAthlete.featured),
        isNew: Boolean(rawAthlete.isNew),
        verse: String(rawAthlete.verse || DEFAULT_VERSE).trim(),
        bio: String(rawAthlete.bio || 'Athlete profile coming soon.').trim(),
        image,
        submittedBy: '',
        source: 'seed-import',
        submittedAt: '',
        moderationStatus: 'approved',
        moderationNotes: 'Imported from src/data/athletes.json',
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'seed-import',
      })
    )
  }

  await index.upsertRecords({ records })

  console.log(`Imported ${records.length} seed athletes into Pinecone and uploaded ${uploadedImages.size} images to Vercel Blob.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
