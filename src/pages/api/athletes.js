import { getAthletes, isPineconeEnabled, saveAthleteProfile } from '../../lib/athlete-repository'
import { DEFAULT_IMAGE, DEFAULT_VERSE, slugify } from '../../lib/athletes'
import { privateNoStoreHeader, publicCacheHeader } from '../../lib/http-cache'

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': privateNoStoreHeader(),
      ...(init.headers || {}),
    },
  })
}

function validateSubmission(body) {
  const name = String(body?.name || '').trim()
  const sport = String(body?.sport || '').trim()
  const team = String(body?.team || '').trim()
  const bio = String(body?.bio || '').trim()
  const verse = String(body?.verse || '').trim() || DEFAULT_VERSE
  const submittedBy = String(body?.submittedBy || 'athlete').trim()
  const image = String(body?.image || '').trim() || DEFAULT_IMAGE
  const instagram = String(body?.instagram || '').trim()
  const youtubeVideo = String(body?.youtubeVideo || '').trim()
  const instagramVideo = String(body?.instagramVideo || '').trim()
  const x = String(body?.x || '').trim()

  if (!name || !sport || !team || !bio) {
    throw new Error('Please fill out the athlete name, sport, team, and bio before saving.')
  }

  validateUrl(image, 'Image URLs')
  validateUrl(instagram, 'Instagram links')
  validateUrl(youtubeVideo, 'YouTube video links')
  validateUrl(instagramVideo, 'Instagram video links')
  validateUrl(x, 'X links')

  return {
    slug: slugify(name),
    name,
    sport,
    team,
    bio,
    verse,
    image,
    instagram,
    youtubeVideo,
    instagramVideo,
    x,
    submittedBy,
    featured: false,
    isNew: true,
    moderationStatus: 'pending',
  }
}

function validateUrl(value, label) {
  if (!value || value === DEFAULT_IMAGE) return

  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`${label} must use http or https.`)
    }
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message === `${label} must use http or https.`
        ? error.message
        : `Please enter a valid ${label.toLowerCase()}.`
    )
  }
}

export async function GET() {
  const athletes = await getAthletes()

  return json({
    athletes,
    pineconeEnabled: isPineconeEnabled(),
  }, {
    headers: {
      'cache-control': publicCacheHeader({ sMaxAge: 120, staleWhileRevalidate: 1800 }),
    },
  })
}

export async function POST({ request }) {
  let body

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  let payload

  try {
    payload = validateSubmission(body)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid athlete submission.' }, { status: 400 })
  }

  const athletes = await getAthletes({ includeUnapproved: true })
  const alreadyExists = athletes.some((athlete) => athlete.slug === payload.slug)

  if (alreadyExists) {
    return json(
      { error: 'That athlete already exists in the directory. Try a more specific name.' },
      { status: 409 }
    )
  }

  try {
    const athlete = await saveAthleteProfile(payload)
    return json({ athlete }, { status: 201 })
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : 'We could not save this athlete profile right now.',
      },
      { status: 500 }
    )
  }
}
