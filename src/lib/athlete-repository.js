import { Pinecone } from '@pinecone-database/pinecone'

import {
  DEFAULT_MODERATION_STATUS,
  DEFAULT_IMAGE,
  DEFAULT_VERSE,
  findAthleteBySlug,
  getStaticAthletes,
  mergeAthletes,
  normalizeAthlete,
  slugify,
} from './athletes.js'

function getEnv(key) {
  const viteValue = import.meta.env?.[key]
  if (typeof viteValue === 'string' && viteValue.trim()) return viteValue.trim()

  const nodeValue = process.env?.[key]
  if (typeof nodeValue === 'string' && nodeValue.trim()) return nodeValue.trim()

  return ''
}

const PINECONE_NAMESPACE = getEnv('PINECONE_NAMESPACE') || 'athletes'
const ATHLETE_RECORD_PREFIX = 'athlete#'
const STORED_CACHE_TTL_MS = 60 * 1000

let pineconeClient
let storedAthletesCache = {
  value: null,
  expiresAt: 0,
}

function getPineconeConfig() {
  const apiKey = getEnv('PINECONE_API_KEY')
  const indexName = getEnv('PINECONE_INDEX_NAME')
  const indexHost = getEnv('PINECONE_INDEX_HOST')

  return {
    apiKey,
    indexName,
    indexHost,
    enabled: Boolean(apiKey && (indexName || indexHost)),
  }
}

function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: getEnv('PINECONE_API_KEY') })
  }

  return pineconeClient
}

function getPineconeIndex() {
  const config = getPineconeConfig()
  if (!config.enabled) return null

  const client = getPineconeClient()
  const index = config.indexHost
    ? client.index({ host: config.indexHost })
    : client.index({ name: config.indexName })

  return index.namespace(PINECONE_NAMESPACE)
}

function athleteRecordId(slug) {
  return `${ATHLETE_RECORD_PREFIX}${slug}`
}

function getStaticAthleteBySlug(slug) {
  return findAthleteBySlug(slug, getStaticAthletes())
}

function toMetadataString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function getRecordData(record) {
  if (!record || typeof record !== 'object') return {}

  const metadata = record.metadata
  if (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) {
    return { ...record, ...metadata }
  }

  return record
}

function recordToAthlete(record) {
  const data = getRecordData(record)

  return normalizeAthlete({
    slug: toMetadataString(data.slug) || slugify(data.name),
    name: toMetadataString(data.name),
    sport: toMetadataString(data.sport),
    team: toMetadataString(data.team),
    verse: toMetadataString(data.verse, DEFAULT_VERSE),
    bio: toMetadataString(data.bio),
    image: toMetadataString(data.image, DEFAULT_IMAGE),
    instagram: toMetadataString(data.instagram),
    youtubeVideo: toMetadataString(data.youtubeVideo),
    instagramVideo: toMetadataString(data.instagramVideo),
    spotifyPodcast: toMetadataString(data.spotifyPodcast),
    applePodcast: toMetadataString(data.applePodcast),
    x: toMetadataString(data.x),
    featured: Boolean(data.featured),
    isNew: Boolean(data.isNew),
    submittedBy: toMetadataString(data.submittedBy),
    source: toMetadataString(data.source, 'pinecone'),
    submittedAt: toMetadataString(data.submittedAt),
    moderationStatus: toMetadataString(data.moderationStatus, DEFAULT_MODERATION_STATUS),
    moderationNotes: toMetadataString(data.moderationNotes),
    reviewedAt: toMetadataString(data.reviewedAt),
    reviewedBy: toMetadataString(data.reviewedBy),
  })
}

function athleteToRecord(athlete) {
  const normalized = normalizeAthlete(athlete)

  return {
    id: athleteRecordId(normalized.slug),
    chunk_text: [
      normalized.name,
      normalized.sport,
      normalized.team,
      normalized.bio,
      normalized.verse,
      normalized.instagram,
      normalized.youtubeVideo,
      normalized.instagramVideo,
      normalized.spotifyPodcast,
      normalized.applePodcast,
      normalized.x,
    ]
      .filter(Boolean)
      .join('\n'),
    slug: normalized.slug,
    name: normalized.name,
    sport: normalized.sport,
    team: normalized.team,
    verse: normalized.verse || DEFAULT_VERSE,
    bio: normalized.bio,
    image: normalized.image || DEFAULT_IMAGE,
    instagram: normalized.instagram,
    youtubeVideo: normalized.youtubeVideo,
    instagramVideo: normalized.instagramVideo,
    spotifyPodcast: normalized.spotifyPodcast,
    applePodcast: normalized.applePodcast,
    x: normalized.x,
    featured: Boolean(normalized.featured),
    isNew: Boolean(normalized.isNew),
    submittedBy: normalized.submittedBy,
    source: normalized.source || 'pinecone',
    submittedAt: normalized.submittedAt || new Date().toISOString(),
    moderationStatus: normalized.moderationStatus || DEFAULT_MODERATION_STATUS,
    moderationNotes: normalized.moderationNotes,
    reviewedAt: normalized.reviewedAt,
    reviewedBy: normalized.reviewedBy,
  }
}

async function listPineconeAthleteIds(index) {
  const ids = []
  let paginationToken

  do {
    const response = await index.listPaginated({
      prefix: ATHLETE_RECORD_PREFIX,
      paginationToken,
    })

    ids.push(...(response.vectors || []).map((vector) => vector.id).filter(Boolean))
    paginationToken = response.pagination?.next
  } while (paginationToken)

  return ids
}

export function isPineconeEnabled() {
  return getPineconeConfig().enabled
}

export function invalidateAthleteCache() {
  storedAthletesCache = {
    value: null,
    expiresAt: 0,
  }
}

export async function getStoredAthletes(options = {}) {
  const now = Date.now()
  if (!options.force && storedAthletesCache.value && now < storedAthletesCache.expiresAt) {
    return storedAthletesCache.value.map((athlete) => ({ ...athlete }))
  }

  const index = getPineconeIndex()
  if (!index) return []

  const ids = await listPineconeAthleteIds(index)
  if (!ids.length) return []

  const response = await index.fetch({ ids })
  const records = response?.records || response?.vectors || {}

  const athletes = Object.values(records)
    .map(recordToAthlete)
    .filter((athlete) => athlete.name && athlete.sport && athlete.team)

  storedAthletesCache = {
    value: athletes,
    expiresAt: now + STORED_CACHE_TTL_MS,
  }

  return athletes.map((athlete) => ({ ...athlete }))
}

export async function getAthletes(options = {}) {
  const includeUnapproved = Boolean(options.includeUnapproved)
  const [staticAthletes, storedAthletes] = await Promise.all([
    Promise.resolve(getStaticAthletes()),
    getStoredAthletes({ force: options.forceFresh }),
  ])

  if (includeUnapproved) {
    return mergeAthletes(staticAthletes, storedAthletes)
  }

  const athleteMap = new Map(staticAthletes.map((athlete) => [athlete.slug, normalizeAthlete(athlete)]))

  storedAthletes.forEach((athlete) => {
    const normalized = normalizeAthlete(athlete)
    const hasStaticMatch = athleteMap.has(normalized.slug)

    if (normalized.moderationStatus === 'approved') {
      athleteMap.set(normalized.slug, normalized)
      return
    }

    if (normalized.moderationStatus === 'rejected' && hasStaticMatch) {
      athleteMap.delete(normalized.slug)
    }
  })

  return Array.from(athleteMap.values())
}

export async function getAthleteBySlug(slug) {
  const athletes = await getAthletes()
  return findAthleteBySlug(slug, athletes)
}

export async function saveAthleteProfile(input) {
  const index = getPineconeIndex()

  if (!index) {
    throw new Error(
      'Pinecone is not configured yet. Add PINECONE_API_KEY and either PINECONE_INDEX_HOST or PINECONE_INDEX_NAME.'
    )
  }

  const athlete = normalizeAthlete({
    ...input,
    slug: slugify(input?.slug || input?.name),
    verse: input?.verse || DEFAULT_VERSE,
    image: input?.image || DEFAULT_IMAGE,
    featured: Boolean(input?.featured),
    isNew: input?.isNew ?? true,
    source: input?.source || 'pinecone-submission',
    submittedAt: input?.submittedAt || new Date().toISOString(),
    moderationStatus: input?.moderationStatus || 'pending',
    moderationNotes: input?.moderationNotes || '',
    reviewedAt: input?.reviewedAt || '',
    reviewedBy: input?.reviewedBy || '',
  })

  await index.upsertRecords({
    records: [athleteToRecord(athlete)],
  })

  invalidateAthleteCache()

  return athlete
}

export async function getStoredAthleteBySlug(slug, options = {}) {
  const athletes = await getStoredAthletes({ force: options.force })
  return findAthleteBySlug(slug, athletes)
}

export async function updateStoredAthlete(slug, updates) {
  const existing = await getStoredAthleteBySlug(slug, { force: true })

  if (!existing) {
    throw new Error('Athlete not found.')
  }

  const nextSlug = slugify(updates?.slug || updates?.name || existing.slug)
  const storedAthletes = await getStoredAthletes({ force: true })
  const duplicate = storedAthletes.find(
    (athlete) => athlete.slug !== existing.slug && athlete.slug === nextSlug
  )

  if (duplicate) {
    throw new Error('Another athlete already uses that slug or name.')
  }

  const athlete = normalizeAthlete({
    ...existing,
    ...updates,
    slug: nextSlug,
    source: existing.source || 'pinecone-submission',
  })

  const index = getPineconeIndex()
  if (!index) {
    throw new Error(
      'Pinecone is not configured yet. Add PINECONE_API_KEY and either PINECONE_INDEX_HOST or PINECONE_INDEX_NAME.'
    )
  }

  if (athlete.slug !== existing.slug) {
    await index.deleteOne({ id: athleteRecordId(existing.slug) })
  }

  await index.upsertRecords({
    records: [athleteToRecord(athlete)],
  })

  invalidateAthleteCache()

  return athlete
}

export async function updateAthleteProfile(slug, updates) {
  const storedAthlete = await getStoredAthleteBySlug(slug, { force: true })
  if (storedAthlete) {
    return updateStoredAthlete(slug, updates)
  }

  const staticAthlete = getStaticAthleteBySlug(slug)
  if (!staticAthlete) {
    throw new Error('Athlete not found.')
  }

  return saveAthleteProfile({
    ...staticAthlete,
    ...updates,
    slug: slugify(updates?.slug || staticAthlete.slug),
    source: 'admin-override',
    submittedAt: staticAthlete.submittedAt || new Date().toISOString(),
  })
}

export async function deleteStoredAthlete(slug) {
  const index = getPineconeIndex()
  if (!index) {
    throw new Error(
      'Pinecone is not configured yet. Add PINECONE_API_KEY and either PINECONE_INDEX_HOST or PINECONE_INDEX_NAME.'
    )
  }

  await index.deleteOne({ id: athleteRecordId(slugify(slug)) })
  invalidateAthleteCache()
}

export async function deleteAthleteProfile(slug) {
  const normalizedSlug = slugify(slug)
  const storedAthlete = await getStoredAthleteBySlug(normalizedSlug, { force: true })
  const staticAthlete = getStaticAthleteBySlug(normalizedSlug)

  if (staticAthlete) {
    return saveAthleteProfile({
      ...(storedAthlete || staticAthlete),
      slug: normalizedSlug,
      moderationStatus: 'rejected',
      moderationNotes: storedAthlete?.moderationNotes || 'Removed from the public directory by admin.',
      reviewedAt: new Date().toISOString(),
      reviewedBy: storedAthlete?.reviewedBy || 'admin',
      source: 'admin-override',
      submittedAt: storedAthlete?.submittedAt || staticAthlete.submittedAt || new Date().toISOString(),
    })
  }

  if (storedAthlete) {
    await deleteStoredAthlete(normalizedSlug)
    return
  }

  throw new Error('Athlete not found.')
}
