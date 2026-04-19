import {
  deleteAthleteProfile,
  getAthletes,
  saveAthleteProfile,
  updateAthleteProfile,
} from '../../../lib/athlete-repository'
import { DEFAULT_IMAGE, DEFAULT_VERSE, slugify } from '../../../lib/athletes'
import { requireAdmin } from '../../../lib/admin'
import { privateNoStoreHeader } from '../../../lib/http-cache'
import { generateAndUploadHcMask } from '../../../lib/hc-mask-generator'
import { getBlobHcMasks, invalidateHcMaskCache } from '../../../lib/athlete-masks'

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

function validateImage(image) {
  validateUrl(image, 'Image URLs')
}

function validateUrl(value, label) {
  if (!value || value === DEFAULT_IMAGE) return

  if (value.startsWith('/')) return

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

function normalizeAdminUpdate(body) {
  const name = String(body?.name || '').trim()
  const sport = String(body?.sport || '').trim()
  const team = String(body?.team || '').trim()
  const bio = String(body?.bio || '').trim()
  const verse = String(body?.verse || '').trim() || DEFAULT_VERSE
  const image = String(body?.image || '').trim() || DEFAULT_IMAGE
  const instagram = String(body?.instagram || '').trim()
  const youtubeVideo = String(body?.youtubeVideo || '').trim()
  const instagramVideo = String(body?.instagramVideo || '').trim()
  const spotifyPodcast = String(body?.spotifyPodcast || '').trim()
  const applePodcast = String(body?.applePodcast || '').trim()
  const x = String(body?.x || '').trim()
  const moderationStatus = String(body?.moderationStatus || 'pending').trim()
  const moderationNotes = String(body?.moderationNotes || '').trim()
  const featured = Boolean(body?.featured)
  const submittedBy = String(body?.submittedBy || 'athlete').trim()
  const reviewedBy = String(body?.reviewedBy || 'admin').trim()

  if (!name || !sport || !team || !bio) {
    throw new Error('Name, sport, team, and bio are required.')
  }

  if (!['pending', 'approved', 'rejected'].includes(moderationStatus)) {
    throw new Error('Moderation status must be pending, approved, or rejected.')
  }

  validateImage(image)
  validateUrl(instagram, 'Instagram links')
  validateUrl(youtubeVideo, 'YouTube video links')
  validateUrl(instagramVideo, 'Instagram video links')
  validateUrl(spotifyPodcast, 'Spotify podcast links')
  validateUrl(applePodcast, 'Apple podcast links')
  validateUrl(x, 'X links')

  return {
    slug: slugify(body?.slug || name),
    name,
    sport,
    team,
    bio,
    verse,
    image,
    instagram,
    youtubeVideo,
    instagramVideo,
    spotifyPodcast,
    applePodcast,
    x,
    moderationStatus,
    moderationNotes,
    featured,
    submittedBy,
    reviewedAt: new Date().toISOString(),
    reviewedBy,
  }
}

export async function GET({ request }) {
  try {
    requireAdmin(request)
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 })
  }

  const [athletes, hcMasks] = await Promise.all([
    getAthletes({ includeUnapproved: true, forceFresh: true }),
    getBlobHcMasks({ force: true }).catch(() => new Map()),
  ])

  return json({
    athletes: athletes.sort((a, b) => {
      const byStatus = String(a.moderationStatus).localeCompare(String(b.moderationStatus))
      if (byStatus !== 0) return byStatus
      return (Date.parse(b.submittedAt || '') || 0) - (Date.parse(a.submittedAt || '') || 0)
    }).map((athlete) => ({
      ...athlete,
      hcMaskUrl: hcMasks.get(athlete.slug) || '',
    })),
  })
}

export async function PUT({ request }) {
  try {
    requireAdmin(request)
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const slug = String(body?.slug || '').trim()
  if (!slug) {
    return json({ error: 'A slug is required to update an athlete.' }, { status: 400 })
  }

  let updates
  try {
    updates = normalizeAdminUpdate(body)
  } catch (error) {
    return json({ error: error.message }, { status: 400 })
  }

  try {
    const athlete = await updateAthleteProfile(slug, updates)

    // When an athlete is approved and has a real image, kick off HC mask
    // generation in the background so the Classic Holo card works for them.
    if (
      updates.moderationStatus === 'approved' &&
      updates.image &&
      updates.image !== DEFAULT_IMAGE &&
      updates.image.startsWith('http')
    ) {
      generateAndUploadHcMask(athlete.slug, updates.image)
        .then(() => invalidateHcMaskCache())
        .catch(() => {/* non-fatal — mask can be regenerated manually */})
    }

    return json({ athlete })
  } catch (error) {
    return json({ error: error.message || 'We could not update this athlete.' }, { status: 400 })
  }
}

export async function POST({ request }) {
  try {
    requireAdmin(request)
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  let payload
  try {
    payload = normalizeAdminUpdate({
      ...body,
      moderationStatus: body?.moderationStatus || 'approved',
      reviewedBy: body?.reviewedBy || 'admin',
    })
  } catch (error) {
    return json({ error: error.message }, { status: 400 })
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
    const athlete = await saveAthleteProfile({
      ...payload,
      isNew: body?.isNew ?? true,
      source: 'admin',
      submittedAt: new Date().toISOString(),
    })

    // Auto-generate HC mask for approved athletes with a real image
    if (
      athlete.moderationStatus === 'approved' &&
      athlete.image &&
      athlete.image !== DEFAULT_IMAGE &&
      athlete.image.startsWith('http')
    ) {
      generateAndUploadHcMask(athlete.slug, athlete.image)
        .then(() => invalidateHcMaskCache())
        .catch(() => {/* non-fatal */})
    }

    return json({ athlete }, { status: 201 })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'We could not create this athlete.' },
      { status: 500 }
    )
  }
}

export async function DELETE({ request }) {
  try {
    requireAdmin(request)
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 })
  }

  const url = new URL(request.url)
  const slug = String(url.searchParams.get('slug') || '').trim()

  if (!slug) {
    return json({ error: 'A slug is required to delete an athlete.' }, { status: 400 })
  }

  try {
    await deleteAthleteProfile(slug)
    return json({ ok: true })
  } catch (error) {
    return json({ error: error.message || 'We could not delete this athlete.' }, { status: 400 })
  }
}
