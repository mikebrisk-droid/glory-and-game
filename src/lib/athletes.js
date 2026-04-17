import athleteData from '../data/athletes.json'

export const ATHLETE_SUBMISSIONS_KEY = 'gg-athlete-submissions'
export const DEFAULT_IMAGE = '/assets/athletes/default-athlete.jpg'
export const DEFAULT_VERSE = 'Colossians 3:23-24'
export const DEFAULT_SPORTS = ['Football', 'Basketball', 'Baseball', 'Soccer', 'Track & Field', 'Volleyball']
export const DEFAULT_MODERATION_STATUS = 'approved'

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['".,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeSport(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const canonical = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const aliases = new Map([
    ['futbol', 'Soccer'],
    ['football (soccer)', 'Soccer'],
    ['football/soccer', 'Soccer'],
    ['soccer', 'Soccer'],
    ['track and field', 'Track & Field'],
    ['track & field', 'Track & Field'],
    ['track', 'Track & Field'],
    ['mma', 'MMA'],
    ['ufc', 'MMA'],
    ['boxer', 'Boxing'],
    ['boxing', 'Boxing'],
  ])

  if (aliases.has(canonical)) {
    return aliases.get(canonical)
  }

  return trimmed
}

export function normalizeAthlete(raw) {
  return {
    slug: String(raw?.slug || slugify(raw?.name)).trim(),
    name: String(raw?.name || '').trim(),
    sport: normalizeSport(raw?.sport),
    team: String(raw?.team || '').trim(),
    featured: Boolean(raw?.featured),
    isNew: Boolean(raw?.isNew),
    verse: String(raw?.verse || DEFAULT_VERSE).trim(),
    bio: String(raw?.bio || 'Athlete profile coming soon.').trim(),
    image: String(raw?.image || DEFAULT_IMAGE).trim(),
    instagram: String(raw?.instagram || '').trim(),
    youtubeVideo: String(raw?.youtubeVideo || '').trim(),
    instagramVideo: String(raw?.instagramVideo || '').trim(),
    spotifyPodcast: String(raw?.spotifyPodcast || '').trim(),
    applePodcast: String(raw?.applePodcast || '').trim(),
    x: String(raw?.x || '').trim(),
    submittedBy: String(raw?.submittedBy || '').trim(),
    source: String(raw?.source || '').trim(),
    submittedAt: String(raw?.submittedAt || '').trim(),
    moderationStatus: String(raw?.moderationStatus || DEFAULT_MODERATION_STATUS).trim(),
    moderationNotes: String(raw?.moderationNotes || '').trim(),
    reviewedAt: String(raw?.reviewedAt || '').trim(),
    reviewedBy: String(raw?.reviewedBy || '').trim(),
  }
}

export function mergeAthletes(...groups) {
  const bySlug = new Map()

  groups.flat().forEach((athlete) => {
    const normalized = normalizeAthlete(athlete)
    if (!normalized.name || !normalized.sport || !normalized.team) return
    bySlug.set(normalized.slug, normalized)
  })

  return Array.from(bySlug.values())
}

export function sortNewestFirst(athletes) {
  return [...athletes].sort((a, b) => {
    const aTime = Date.parse(a.submittedAt || '') || 0
    const bTime = Date.parse(b.submittedAt || '') || 0
    return bTime - aTime
  })
}

export function getAllAthletes() {
  return athleteData.map(normalizeAthlete)
}

export function getStaticAthletes() {
  return getAllAthletes()
}

export function getFeaturedAthletes(athletes = getAllAthletes(), limit = 3) {
  return athletes.filter((athlete) => athlete.featured).slice(0, limit)
}

export function getNewestAthletes(athletes = getAllAthletes(), limit = 3) {
  return sortNewestFirst(athletes.filter((athlete) => athlete.isNew)).slice(0, limit)
}

export function getSports(athletes = getAllAthletes()) {
  const sports = Array.from(new Set(athletes.map((athlete) => athlete.sport).filter(Boolean)))
  return sports.length ? sports : DEFAULT_SPORTS
}

export function findAthleteBySlug(slug, athletes = getAllAthletes()) {
  const wanted = slugify(slug)
  return athletes.find((athlete) => athlete.slug === wanted || slugify(athlete.name) === wanted)
}

export function filterAthletes(athletes, filters = {}) {
  const q = String(filters.q || '').trim().toLowerCase()
  const sport = normalizeSport(filters.sport).toLowerCase()
  const team = String(filters.team || '').trim().toLowerCase()
  const featuredOnly = Boolean(filters.featuredOnly)
  const newOnly = Boolean(filters.newOnly)

  return athletes.filter((athlete) => {
    if (sport && athlete.sport.toLowerCase() !== sport) return false
    if (team && athlete.team.toLowerCase() !== team) return false
    if (featuredOnly && !athlete.featured) return false
    if (newOnly && !athlete.isNew) return false
    if (!q) return true
    const haystack = `${athlete.name} ${athlete.sport} ${athlete.team}`.toLowerCase()
    return haystack.includes(q)
  })
}
