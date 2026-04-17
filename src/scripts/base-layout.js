import { mountSiteNoise } from './site-noise.js'
import { bindCardPreviewHover } from './card-preview-hover.js'

const navToggle = document.querySelector('[data-nav-toggle]')
const nav = document.querySelector('[data-nav]')
const adminNavLink = document.querySelector('[data-admin-nav-link="true"]')
const adminStorageKey = 'gg-admin-secret'
let cleanupNoise = null
let cleanupHeroCardPreview = null

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

function initHeroCardPreview() {
  cleanupHeroCardPreview?.()
  cleanupHeroCardPreview = null

  const heroCardFrame = document.querySelector('[data-hero-card-preview]')
  if (!(heroCardFrame instanceof HTMLElement)) return

  const preview = heroCardFrame.querySelector('[data-card-preview]')
  const hero = heroCardFrame.closest('.hero')

  if (!(preview instanceof HTMLElement)) return

  cleanupHeroCardPreview = bindCardPreviewHover(preview, {
    hoverSurface: hero instanceof HTMLElement ? hero : heroCardFrame,
    restX: 0.58,
    restY: 0.42,
    restDamp: 0.62,
    restOpacity: 0.76,
    activeDamp: 0.72,
    activeOpacity: 0.82,
  })
}

function syncAdminNav() {
  if (!(adminNavLink instanceof HTMLElement)) return
  adminNavLink.hidden = !window.sessionStorage.getItem(adminStorageKey)
}

syncAdminNav()
initSiteNoise()
initHeroVideo()
initHeroCardPreview()
document.addEventListener('astro:page-load', () => {
  initSiteNoise()
  initHeroVideo()
  initHeroCardPreview()
})
document.addEventListener('astro:after-swap', () => {
  requestAnimationFrame(() => {
    initSiteNoise()
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
    cleanupNoise?.()
    cleanupHeroCardPreview?.()
    window.removeEventListener('storage', syncAdminNav)
    window.removeEventListener('gg-admin-auth-change', syncAdminNav)
  },
  { once: true }
)
