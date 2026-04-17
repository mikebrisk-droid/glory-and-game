import {
  ATHLETE_SUBMISSIONS_KEY,
  DEFAULT_IMAGE,
  DEFAULT_VERSE,
  filterAthletes,
  mergeAthletes,
  normalizeAthlete,
  slugify,
  sortNewestFirst,
} from '../lib/athletes'
import { escapeHtml, formatBioHtml } from '../lib/rich-text'

export function readStoredAthletes() {
  try {
    const raw = window.localStorage.getItem(ATHLETE_SUBMISSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeAthlete) : []
  } catch {
    return []
  }
}

export function persistStoredAthletes(athletes) {
  window.localStorage.setItem(ATHLETE_SUBMISSIONS_KEY, JSON.stringify(athletes.map(normalizeAthlete)))
}

export function getMergedAthletes(baseAthletes) {
  return mergeAthletes(baseAthletes, readStoredAthletes())
}

export function athleteHref(athlete) {
  return `/athletes/${encodeURIComponent(athlete.slug || slugify(athlete.name))}/`
}

export function athleteCardMarkup(athlete) {
  return `
    <a class="card-link athlete-card" href="${athleteHref(athlete)}">
      <img src="${escapeHtml(athlete.image)}" alt="${escapeHtml(athlete.name)}" loading="lazy" decoding="async" />
      <div class="athlete-card__copy">
        <h3>${escapeHtml(athlete.name)}</h3>
        <p>${escapeHtml(athlete.sport)} • ${escapeHtml(athlete.team)}</p>
      </div>
    </a>
  `
}

export function playerCardMarkup(athlete) {
  return `
    <a class="card-link player-card" href="${athleteHref(athlete)}">
      <div class="player-card__media">
        <img src="${escapeHtml(athlete.image)}" alt="${escapeHtml(athlete.name)}" loading="lazy" decoding="async" />
      </div>
      <div class="player-card__copy">
        <h3>${escapeHtml(athlete.name)}</h3>
        <p>${escapeHtml(athlete.sport)} • ${escapeHtml(athlete.team)}</p>
        <span>View Profile</span>
      </div>
    </a>
  `
}

export function searchCardMarkup(athlete) {
  return playerCardMarkup(athlete)
}

export function detailMarkup(athlete) {
  const verseUrl = athlete.verse
    ? `https://www.bible.com/search/bible?q=${encodeURIComponent(athlete.verse)}`
    : ''
  const socialLinks = [athlete.instagram && `
          <a class="social-button social-button--instagram" href="${athlete.instagram}" target="_blank" rel="noreferrer">
            <span class="social-button__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9Zm9.55 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z" fill="currentColor" />
              </svg>
            </span>
            Instagram
          </a>
        `, athlete.x && `
          <a class="social-button social-button--x" href="${athlete.x}" target="_blank" rel="noreferrer">
            <span class="social-button__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M18.9 2H22l-6.78 7.75L23 22h-6.1l-4.77-6.92L6.08 22H3l7.27-8.32L1 2h6.25l4.31 6.28L18.9 2Zm-1.07 18.13h1.69L6.33 3.77H4.51l13.32 16.36Z" fill="currentColor" />
              </svg>
            </span>
            X
          </a>
        `]
    .filter(Boolean)
    .join('')
  const audioLinks = [athlete.spotifyPodcast && `
          <a class="social-button social-button--spotify" href="${athlete.spotifyPodcast}" target="_blank" rel="noreferrer">
            <span class="social-button__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M12 1.5a10.5 10.5 0 1 0 10.5 10.5A10.51 10.51 0 0 0 12 1.5Zm4.82 15.14a.9.9 0 0 1-1.24.3 8.73 8.73 0 0 0-8.82-.48.9.9 0 1 1-.8-1.6 10.54 10.54 0 0 1 10.65.59.9.9 0 0 1 .21 1.19Zm1.77-2.76a1.13 1.13 0 0 1-1.55.37 10.79 10.79 0 0 0-10.88-.6 1.13 1.13 0 1 1-.97-2.04 13.04 13.04 0 0 1 13.15.72 1.12 1.12 0 0 1 .25 1.55Zm.15-2.87a13.1 13.1 0 0 0-13.34-.72 1.35 1.35 0 0 1-1.24-2.4 15.8 15.8 0 0 1 16.08.87 1.35 1.35 0 0 1-1.5 2.25Z" fill="currentColor" />
              </svg>
            </span>
            Spotify
          </a>
        `, athlete.applePodcast && `
          <a class="social-button social-button--apple-podcast" href="${athlete.applePodcast}" target="_blank" rel="noreferrer">
            <span class="social-button__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M17.57 12.72a4.73 4.73 0 0 1 2.26-3.98 4.87 4.87 0 0 0-3.83-2.08c-1.61-.17-3.18.96-4 1-.84 0-2.1-.98-3.46-.95A5.12 5.12 0 0 0 4 9.36c-1.96 3.39-.5 8.36 1.38 11.1.94 1.34 2.03 2.84 3.46 2.79 1.38-.06 1.9-.88 3.57-.88 1.66 0 2.15.88 3.58.85 1.5-.03 2.44-1.34 3.34-2.69 1.08-1.54 1.51-3.05 1.53-3.13a4.58 4.58 0 0 1-2.29-4.68Zm-2.63-7.76A4.58 4.58 0 0 0 16 1.68a4.66 4.66 0 0 0-3.02 1.59 4.35 4.35 0 0 0-1.1 3.18 3.85 3.85 0 0 0 3.06-1.49Z" fill="currentColor" />
              </svg>
            </span>
            Apple Podcasts
          </a>
        `]
    .filter(Boolean)
    .join('')

  return `
    <article class="panel detail">
      <div class="detail__media">
        <img src="${escapeHtml(athlete.image)}" alt="${escapeHtml(athlete.name)}" loading="lazy" decoding="async" />
      </div>
      <div class="detail__copy">
        <p class="eyebrow">Athlete Profile</p>
        <h1>${escapeHtml(athlete.name)}</h1>
        <p class="meta">${escapeHtml(athlete.sport)} • ${escapeHtml(athlete.team)}</p>
        <div class="detail__bio">${formatBioHtml(athlete.bio)}</div>
        <div class="verse-row">
          <blockquote>${escapeHtml(athlete.verse)}</blockquote>
          ${
            verseUrl
              ? `<p class="verse-link">
                  <a href="${verseUrl}" target="_blank" rel="noreferrer">Read on Bible.com</a>
                </p>`
              : ''
          }
        </div>
        ${
          socialLinks
            ? `<div class="profile-socials">
                <p class="profile-socials__label">Follow</p>
                <div class="profile-socials__links">${socialLinks}</div>
              </div>`
            : ''
        }
        ${
          audioLinks
            ? `<div class="profile-socials profile-audio">
                <p class="profile-socials__label">Listen</p>
                <div class="profile-socials__links">${audioLinks}</div>
              </div>`
            : ''
        }
        <div class="hero__actions">
          <a class="button-secondary" href="/players/">Back to Players</a>
        </div>
      </div>
    </article>
  `
}

export function mountHomePage(baseAthletes) {
  const athletes = getMergedAthletes(baseAthletes)
  const newest = sortNewestFirst(athletes.filter((athlete) => athlete.isNew)).slice(0, 3)
  const newestNode = document.querySelector('[data-home-newest]')
  const countNode = document.querySelector('[data-athlete-count]')
  const sportsCountNode = document.querySelector('[data-sports-count]')
  const sportsCount = new Set(athletes.map((athlete) => athlete.sport).filter(Boolean)).size

  if (countNode) countNode.textContent = `${athletes.length}`
  if (sportsCountNode) sportsCountNode.textContent = `${sportsCount}`
  if (newestNode) {
    newestNode.innerHTML = newest.length
      ? newest.map(athleteCardMarkup).join('')
      : '<p class="empty-state">No new athletes added yet.</p>'
  }
}

export function mountPlayersPage(baseAthletes) {
  const athletes = getMergedAthletes(baseAthletes).sort((a, b) => a.name.localeCompare(b.name))
  const grid = document.querySelector('[data-players-grid]')
  const count = document.querySelector('[data-players-count]')
  if (count) count.textContent = `${athletes.length}`
  if (grid) {
    grid.innerHTML = athletes.length
      ? athletes.map(playerCardMarkup).join('')
      : '<p class="empty-state">No players added yet.</p>'
  }
}

export function mountSearchPage(baseAthletes) {
  const athletes = getMergedAthletes(baseAthletes)
  const params = new URLSearchParams(window.location.search)
  const filters = {
    q: params.get('q') || '',
    sport: params.get('sport') || '',
    team: params.get('team') || '',
    featuredOnly: params.get('featured') === '1',
    newOnly: params.get('new') === '1',
  }
  const hasActiveSearch = Boolean(
    filters.q || filters.sport || filters.team || filters.featuredOnly || filters.newOnly
  )
  const results = hasActiveSearch ? filterAthletes(athletes, filters) : []
  const resultsNode = document.querySelector('[data-search-results]')
  const countNode = document.querySelector('[data-search-count]')
  const activeNode = document.querySelector('[data-search-active]')

  const activeBits = []
  if (filters.q) activeBits.push(`query: "${filters.q}"`)
  if (filters.sport) activeBits.push(`sport: ${filters.sport}`)
  if (filters.team) activeBits.push(`team: ${filters.team}`)
  if (filters.featuredOnly) activeBits.push('featured only')
  if (filters.newOnly) activeBits.push('new only')

  if (countNode) countNode.textContent = `${results.length}`
  if (activeNode) activeNode.textContent = activeBits.length ? activeBits.join(' • ') : 'search to begin'
  if (resultsNode) {
    resultsNode.innerHTML = !hasActiveSearch
      ? '<p class="empty-state">Search by player, team, sport, or use one of the quick filters to see results.</p>'
      : results.length
        ? results.map(searchCardMarkup).join('')
        : '<p class="empty-state">No athletes matched your filters yet. Try a different sport, team, or player name.</p>'
  }
}

export function mountAthletePage(baseAthletes, slug) {
  const athletes = getMergedAthletes(baseAthletes)
  const athlete = athletes.find((candidate) => candidate.slug === slug || slugify(candidate.name) === slug)
  const target = document.querySelector('[data-athlete-detail]')
  if (!target) return

  if (athlete) {
    target.innerHTML = detailMarkup(athlete)
    return
  }

  target.innerHTML = detailMarkup({
    name: 'Athlete Not Found',
    sport: 'Profile',
    team: 'Glory & Game',
    verse: DEFAULT_VERSE,
    bio: 'We could not find this athlete yet. Browse the directory or submit a new profile.',
    image: DEFAULT_IMAGE,
    slug: 'not-found',
  })
}

export function mountSubmitPage(baseAthletes) {
  const form = document.querySelector('[data-athlete-form]')
  const feedback = document.querySelector('[data-form-feedback]')

  if (!(form instanceof HTMLFormElement) || !(feedback instanceof HTMLElement)) return

  const requiredLabels = {
    name: 'athlete name',
    sport: 'sport',
    team: 'team',
    bio: 'short bio',
  }

  function setFieldErrorState(fieldName, active) {
    const field = form.querySelector(`[data-field="${fieldName}"]`)
    if (!(field instanceof HTMLElement)) return

    if (active) {
      field.dataset.invalid = 'true'
      return
    }

    delete field.dataset.invalid
  }

  function clearFieldErrors() {
    Object.keys(requiredLabels).forEach((fieldName) => {
      setFieldErrorState(fieldName, false)
    })
  }

  function showFeedback(message, tone = 'error') {
    feedback.dataset.tone = tone
    feedback.textContent = message
    feedback.hidden = false
    feedback.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function uploadImage(file, athleteName) {
    const uploadBody = new FormData()
    uploadBody.set('file', file)
    uploadBody.set('athleteName', athleteName)

    const response = await window.fetch('/api/uploads/athlete-image', {
      method: 'POST',
      body: uploadBody,
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok || !payload?.url) {
      throw new Error(payload?.error || 'We could not upload that image.')
    }

    return payload.url
  }

  form.addEventListener('input', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return
    }

    if (target.name in requiredLabels && String(target.value || '').trim()) {
      setFieldErrorState(target.name, false)
    }
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearFieldErrors()
    feedback.hidden = true

    const formData = new FormData(form)
    const name = String(formData.get('name') || '').trim()
    const sport = String(formData.get('sport') || '').trim()
    const team = String(formData.get('team') || '').trim()
    const verse = String(formData.get('verse') || '').trim() || DEFAULT_VERSE
    const bio = String(formData.get('bio') || '').trim()
      const submittedBy = String(formData.get('submittedBy') || 'athlete').trim()
      const imageUrl = String(formData.get('image') || '').trim()
      const youtubeVideo = String(formData.get('youtubeVideo') || '').trim()
      const instagramVideo = String(formData.get('instagramVideo') || '').trim()
      const spotifyPodcast = String(formData.get('spotifyPodcast') || '').trim()
      const applePodcast = String(formData.get('applePodcast') || '').trim()
      const imageFile = formData.get('imageFile')

    const missingFields = Object.entries({ name, sport, team, bio })
      .filter(([, value]) => !value)
      .map(([fieldName]) => fieldName)

    if (missingFields.length) {
      missingFields.forEach((fieldName) => setFieldErrorState(fieldName, true))
      const missingList = missingFields.map((fieldName) => requiredLabels[fieldName]).join(', ')
      showFeedback(`Missing required fields: ${missingList}. Please fill those in before saving.`, 'error')
      return
    }

    const allAthletes = getMergedAthletes(baseAthletes)
    const slug = slugify(name)
    const alreadyExists = allAthletes.some((athlete) => athlete.slug === slug)
    if (alreadyExists) {
      setFieldErrorState('name', true)
      showFeedback('That athlete already exists in the directory. Try a more specific name.', 'error')
      return
    }

    try {
      let image = imageUrl || DEFAULT_IMAGE

      if (imageFile instanceof File && imageFile.size > 0) {
        showFeedback('Uploading image...', 'success')
        image = await uploadImage(imageFile, name)
      }

      const response = await window.fetch('/api/athletes', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name,
          sport,
          team,
          verse,
          bio,
          image,
          youtubeVideo,
          instagramVideo,
          spotifyPodcast,
          applePodcast,
          submittedBy,
          }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'We could not save this athlete profile.')
      }

      showFeedback('Profile submitted for review. It will appear in the directory after approval.', 'success')
      form.reset()
      clearFieldErrors()
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : 'We could not save this athlete profile.',
        'error'
      )
    }
  })
}
