function cleanUrl(value) {
  return String(value || '').trim()
}

function safeParseUrl(value) {
  const input = cleanUrl(value)
  if (!input) return null

  try {
    return new URL(input)
  } catch {
    return null
  }
}

function getYoutubeEmbedUrl(value) {
  const url = safeParseUrl(value)
  if (!url) return ''

  const host = url.hostname.replace(/^www\./, '')
  let videoId = ''

  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] || ''
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') || ''
    } else {
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
        videoId = parts[1] || ''
      }
    }
  }

  if (!videoId) return ''
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1`
}

function getYoutubeVideoId(value) {
  const url = safeParseUrl(value)
  if (!url) return ''

  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] || ''
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v') || ''
    }

    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
      return parts[1] || ''
    }
  }

  return ''
}

function getInstagramEmbedUrl(value) {
  const url = safeParseUrl(value)
  if (!url) return ''

  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'instagram.com' && host !== 'instagr.am') return ''

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) return ''

  const kind = parts[0]
  const id = parts[1]
  if (!['reel', 'p', 'tv'].includes(kind) || !id) return ''

  return `https://www.instagram.com/${kind}/${encodeURIComponent(id)}/embed/captioned/`
}

export function getAthleteVideoLinks(athlete) {
  const links = []
  const youtubeUrl = cleanUrl(athlete?.youtubeVideo)
  const instagramUrl = cleanUrl(athlete?.instagramVideo)
  const youtubeEmbedUrl = getYoutubeEmbedUrl(youtubeUrl)
  const instagramEmbedUrl = getInstagramEmbedUrl(instagramUrl)
  const youtubeVideoId = getYoutubeVideoId(youtubeUrl)

  if (youtubeUrl && youtubeEmbedUrl) {
    links.push({
      id: 'youtube',
      label: 'YouTube',
      url: youtubeUrl,
      embedUrl: youtubeEmbedUrl,
      aspect: 'landscape',
      thumbnailUrl: youtubeVideoId
        ? `https://i.ytimg.com/vi/${encodeURIComponent(youtubeVideoId)}/hqdefault.jpg`
        : '',
    })
  }

  if (instagramUrl && instagramEmbedUrl) {
    links.push({
      id: 'instagram',
      label: 'Instagram',
      url: instagramUrl,
      embedUrl: instagramEmbedUrl,
      aspect: 'portrait',
      thumbnailUrl: '',
    })
  }

  return links
}
