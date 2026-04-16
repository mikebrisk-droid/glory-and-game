import { mountSiteNoise } from './site-noise.js'

const cleanupNoise = mountSiteNoise({
  patternRefreshInterval: 2,
  patternAlpha: 32,
  canvasSize: 1400,
})

const navToggle = document.querySelector('[data-nav-toggle]')
const nav = document.querySelector('[data-nav]')
const adminNavLink = document.querySelector('[data-admin-nav-link="true"]')
const adminStorageKey = 'gg-admin-secret'
let cleanupHeroCardPreview = null

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

function initHeroCardPreview() {
  cleanupHeroCardPreview?.()
  cleanupHeroCardPreview = null

  const heroPreview = document.querySelector('[data-hero-card-preview] [data-card-preview]')
  if (!(heroPreview instanceof HTMLElement)) return

  const card = heroPreview.querySelector('[data-player-card]')
  const scaler = heroPreview.querySelector('.player-card-3d-scaler')
  const stage = heroPreview.querySelector('.card-preview__stage')
  const hero = heroPreview.closest('.hero')

  if (!(card instanceof HTMLElement) || !(scaler instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
    return
  }

  ;['.ch-card', '.design-card'].forEach((selector) => {
    const el = heroPreview.querySelector(selector)
    if (el instanceof HTMLElement) {
      const url = el.dataset.maskUrl
      if (url) el.style.setProperty('--mask', `url("${url}")`)
    }
  })

  const setCardVars = (x, y) => {
    const rotX = (0.5 - y) * 22
    const rotY = (x - 0.5) * 22
    const hyp = Math.min(Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2) * 2, 1)

    card.style.setProperty('--card-rotate-x', `${rotX.toFixed(2)}deg`)
    card.style.setProperty('--card-rotate-y', `${rotY.toFixed(2)}deg`)
    card.style.setProperty('--card-pos-x', `${(x * 100).toFixed(1)}%`)
    card.style.setProperty('--card-pos-y', `${(y * 100).toFixed(1)}%`)
    card.style.setProperty('--card-pos-x-invert', `${((1 - x) * 100).toFixed(1)}%`)
    card.style.setProperty('--card-pos-y-invert', `${((1 - y) * 100).toFixed(1)}%`)
    card.style.setProperty('--card-glare-x', `${(x * 100).toFixed(1)}%`)
    card.style.setProperty('--card-glare-y', `${(y * 100).toFixed(1)}%`)
    card.style.setProperty('--card-hyp', hyp.toFixed(3))
    card.style.setProperty('--card-opacity', '1')
    card.style.setProperty('--pointer-from-left', x.toFixed(3))
    card.style.setProperty('--pointer-from-top', y.toFixed(3))
    card.style.setProperty('--pointer-x', `${(x * 100).toFixed(1)}%`)
    card.style.setProperty('--pointer-y', `${(y * 100).toFixed(1)}%`)
  }

  setCardVars(0.62, 0.38)

  const hoverSurface = hero instanceof HTMLElement ? hero : stage
  let wasInside = false

  const handleMove = (event) => {
    const rect = hoverSurface.getBoundingClientRect()
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom

    if (!inside) {
      if (wasInside) {
        setCardVars(0.62, 0.38)
        wasInside = false
      }
      return
    }

    wasInside = true
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    setCardVars(x, y)
  }

  const handleLeave = () => {
    wasInside = false
    setCardVars(0.62, 0.38)
  }

  document.addEventListener('pointermove', handleMove, { passive: true })
  document.addEventListener('mousemove', handleMove, { passive: true })
  window.addEventListener('blur', handleLeave)
  document.addEventListener('visibilitychange', handleLeave)

  cleanupHeroCardPreview = () => {
    document.removeEventListener('pointermove', handleMove)
    document.removeEventListener('mousemove', handleMove)
    window.removeEventListener('blur', handleLeave)
    document.removeEventListener('visibilitychange', handleLeave)
  }
}

function syncAdminNav() {
  if (!(adminNavLink instanceof HTMLElement)) return
  adminNavLink.hidden = !window.sessionStorage.getItem(adminStorageKey)
}

syncAdminNav()
initHeroVideo()
initHeroCardPreview()
document.addEventListener('astro:page-load', () => {
  initHeroVideo()
  initHeroCardPreview()
})
document.addEventListener('astro:after-swap', () => {
  requestAnimationFrame(() => {
    initHeroVideo()
    initHeroCardPreview()
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
    cleanupHeroCardPreview?.()
    cleanupNoise?.()
    window.removeEventListener('storage', syncAdminNav)
    window.removeEventListener('gg-admin-auth-change', syncAdminNav)
  },
  { once: true }
)
