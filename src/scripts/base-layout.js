import { mountSiteNoise } from './site-noise.js'

const navToggle = document.querySelector('[data-nav-toggle]')
const nav = document.querySelector('[data-nav]')
const adminNavLink = document.querySelector('[data-admin-nav-link="true"]')
const adminStorageKey = 'gg-admin-secret'
let cleanupNoise = null
let heroCardTrackingBound = false
let heroCardWasInside = false

function initSiteNoise() {
  cleanupNoise?.()
  cleanupNoise = null

  cleanupNoise = mountSiteNoise({
    patternRefreshInterval: 2,
    patternAlpha: 32,
    canvasSize: 1400,
  })
}

function initHeroVideo() {
  const video = document.querySelector('.hero__video')
  if (!(video instanceof HTMLVideoElement)) return

  // Astro view transitions can restore the node in a paused state on return.
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')

  const restart = () => {
    const playPromise = video.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    restart()
    return
  }

  video.load()
  restart()
}

function getHeroCardPreviewState() {
  const heroPreview = document.querySelector('[data-hero-card-preview] [data-card-preview]')
  if (!(heroPreview instanceof HTMLElement)) return null

  const card = heroPreview.querySelector('[data-player-card]')
  const scaler = heroPreview.querySelector('.player-card-3d-scaler')
  const stage = heroPreview.querySelector('.card-preview__stage')
  const hero = heroPreview.closest('.hero')

  if (!(card instanceof HTMLElement) || !(scaler instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
    return null
  }

  return { heroPreview, card, scaler, stage, hero: hero instanceof HTMLElement ? hero : stage }
}

function applyHeroCardMask(heroPreview) {
  ;['.ch-card', '.design-card'].forEach((selector) => {
    const el = heroPreview.querySelector(selector)
    if (el instanceof HTMLElement) {
      const url = el.dataset.maskUrl
      if (url) el.style.setProperty('--mask', `url("${url}")`)
    }
  })
}

function setHeroCardVars(card, x, y, { damp = 0.72, opacity = 0.82 } = {}) {
  const dampedX = 0.5 + ((x - 0.5) * damp)
  const dampedY = 0.5 + ((y - 0.5) * damp)
  const rotX = (0.5 - dampedY) * 18
  const rotY = (dampedX - 0.5) * 18
  const hyp = Math.min(Math.sqrt((dampedX - 0.5) ** 2 + (dampedY - 0.5) ** 2) * 2, 0.82)

  card.style.setProperty('--card-rotate-x', `${rotX.toFixed(2)}deg`)
  card.style.setProperty('--card-rotate-y', `${rotY.toFixed(2)}deg`)
  card.style.setProperty('--card-pos-x', `${(dampedX * 100).toFixed(1)}%`)
  card.style.setProperty('--card-pos-y', `${(dampedY * 100).toFixed(1)}%`)
  card.style.setProperty('--card-pos-x-invert', `${((1 - dampedX) * 100).toFixed(1)}%`)
  card.style.setProperty('--card-pos-y-invert', `${((1 - dampedY) * 100).toFixed(1)}%`)
  card.style.setProperty('--card-glare-x', `${(dampedX * 100).toFixed(1)}%`)
  card.style.setProperty('--card-glare-y', `${(dampedY * 100).toFixed(1)}%`)
  card.style.setProperty('--card-hyp', hyp.toFixed(3))
  card.style.setProperty('--card-opacity', opacity.toFixed(3))
  card.style.setProperty('--pointer-from-left', dampedX.toFixed(3))
  card.style.setProperty('--pointer-from-top', dampedY.toFixed(3))
  card.style.setProperty('--pointer-x', `${(dampedX * 100).toFixed(1)}%`)
  card.style.setProperty('--pointer-y', `${(dampedY * 100).toFixed(1)}%`)
}

function resetHeroCardPreview() {
  const state = getHeroCardPreviewState()
  heroCardWasInside = false
  if (!state) return
  applyHeroCardMask(state.heroPreview)
  setHeroCardVars(state.card, 0.58, 0.42, { damp: 0.62, opacity: 0.76 })
}

function bindHeroCardPreviewTracking() {
  if (heroCardTrackingBound) return
  heroCardTrackingBound = true

  const handleMove = (event) => {
    const state = getHeroCardPreviewState()
    if (!state) {
      heroCardWasInside = false
      return
    }

    applyHeroCardMask(state.heroPreview)
    const rect = state.hero.getBoundingClientRect()
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom

    if (!inside) {
      if (heroCardWasInside) {
        resetHeroCardPreview()
      }
      return
    }

    heroCardWasInside = true
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    setHeroCardVars(state.card, x, y)
  }

  const handleLeave = () => {
    resetHeroCardPreview()
  }

  document.addEventListener('pointermove', handleMove, { passive: true })
  document.addEventListener('mousemove', handleMove, { passive: true })
  window.addEventListener('blur', handleLeave)
  document.addEventListener('visibilitychange', handleLeave)
}

function syncAdminNav() {
  if (!(adminNavLink instanceof HTMLElement)) return
  adminNavLink.hidden = !window.sessionStorage.getItem(adminStorageKey)
}

syncAdminNav()
initSiteNoise()
initHeroVideo()
resetHeroCardPreview()
bindHeroCardPreviewTracking()
document.addEventListener('astro:page-load', () => {
  initSiteNoise()
  initHeroVideo()
  resetHeroCardPreview()
})
document.addEventListener('astro:after-swap', () => {
  requestAnimationFrame(() => {
    initSiteNoise()
    initHeroVideo()
    resetHeroCardPreview()
  })
})
window.addEventListener('storage', syncAdminNav)
window.addEventListener('gg-admin-auth-change', syncAdminNav)

if (navToggle instanceof HTMLButtonElement && nav instanceof HTMLElement) {
  const syncMenu = (expanded) => {
    navToggle.setAttribute('aria-expanded', String(expanded))
    nav.dataset.open = expanded ? 'true' : 'false'
    document.body.classList.toggle('menu-open', expanded)
  }

  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true'
    syncMenu(!expanded)
  })

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => syncMenu(false))
  })

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) syncMenu(false)
  })
}

window.addEventListener(
  'beforeunload',
  () => {
    cleanupNoise?.()
    window.removeEventListener('storage', syncAdminNav)
    window.removeEventListener('gg-admin-auth-change', syncAdminNav)
  },
  { once: true }
)
