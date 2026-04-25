const adminStorageKey = 'gg-admin-secret'
let cleanupNoise = null
let cleanupHeroCardPreview = null
let cleanupNavMenu = null

function mountSiteNoise({
  patternRefreshInterval = 2,
  patternAlpha = 15,
  canvasSize = 1024,
} = {}) {
  const canvas = document.querySelector('[data-site-noise]')
  if (!(canvas instanceof HTMLCanvasElement)) return

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  let frame = 0
  let animationId = 0

  const resize = () => {
    canvas.width = canvasSize
    canvas.height = canvasSize
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
  }

  const drawGrain = () => {
    const imageData = ctx.createImageData(canvasSize, canvasSize)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = patternAlpha
    }

    ctx.putImageData(imageData, 0, 0)
  }

  const loop = () => {
    if (frame % patternRefreshInterval === 0) drawGrain()
    frame += 1
    animationId = window.requestAnimationFrame(loop)
  }

  window.addEventListener('resize', resize)
  resize()
  loop()

  return () => {
    window.removeEventListener('resize', resize)
    window.cancelAnimationFrame(animationId)
  }
}

function setCardVars(card, x, y, { opacity = 1, damp = 1 } = {}) {
  const dampedX = 0.5 + ((x - 0.5) * damp)
  const dampedY = 0.5 + ((y - 0.5) * damp)
  const rotX = (0.5 - dampedY) * 22
  const rotY = (dampedX - 0.5) * 22
  const hyp = Math.min(Math.sqrt((dampedX - 0.5) ** 2 + (dampedY - 0.5) ** 2) * 2, 1)

  card.style.setProperty('--card-rotate-x', `${rotX.toFixed(2)}deg`)
  card.style.setProperty('--card-rotate-y', `${rotY.toFixed(2)}deg`)
  card.style.setProperty('--card-pos-x', `${(dampedX * 100).toFixed(1)}%`)
  card.style.setProperty('--card-pos-y', `${(dampedY * 100).toFixed(1)}%`)
  card.style.setProperty('--card-pos-x-invert', `${((1 - dampedX) * 100).toFixed(1)}%`)
  card.style.setProperty('--card-pos-y-invert', `${((1 - dampedY) * 100).toFixed(1)}%`)
  card.style.setProperty('--card-glare-x', `${(dampedX * 100).toFixed(1)}%`)
  card.style.setProperty('--card-glare-y', `${(dampedY * 100).toFixed(1)}%`)
  card.style.setProperty('--card-hyp', hyp.toFixed(3))
  card.style.setProperty('--card-opacity', String(opacity))
  card.style.setProperty('--pointer-from-left', dampedX.toFixed(3))
  card.style.setProperty('--pointer-from-top', dampedY.toFixed(3))
  card.style.setProperty('--pointer-x', `${(dampedX * 100).toFixed(1)}%`)
  card.style.setProperty('--pointer-y', `${(dampedY * 100).toFixed(1)}%`)
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function applyCardMask(preview) {
  ;['.ch-card', '.design-card'].forEach((selector) => {
    const el = preview.querySelector(selector)
    if (el instanceof HTMLElement) {
      const url = el.dataset.maskUrl
      if (url) el.style.setProperty('--mask', `url("${url}")`)
    }
  })
}

function bindCardPreviewHover(
  preview,
  {
    hoverSurface = null,
    restX = 0.62,
    restY = 0.38,
    restDamp = 1,
    restOpacity = 1,
    activeDamp = 1,
    activeOpacity = 1,
  } = {},
) {
  if (!(preview instanceof HTMLElement)) return () => {}

  const card = preview.querySelector('[data-player-card]')
  const scaler = preview.querySelector('.player-card-3d-scaler')
  const stage = preview.querySelector('.card-preview__stage')
  const surface = hoverSurface instanceof HTMLElement ? hoverSurface : stage

  if (!(card instanceof HTMLElement) || !(scaler instanceof HTMLElement) || !(stage instanceof HTMLElement) || !(surface instanceof HTMLElement)) {
    return () => {}
  }

  applyCardMask(preview)
  setCardVars(card, restX, restY, { damp: restDamp, opacity: restOpacity })

  let motionStarted = false
  let latestMotion = null
  let motionFrame = 0
  let currentX = restX
  let currentY = restY
  const canUseMotion = window.matchMedia?.('(pointer: coarse)').matches && 'DeviceOrientationEvent' in window

  const updateMotionFrame = () => {
    motionFrame = 0
    if (!latestMotion) return

    currentX += (latestMotion.x - currentX) * 0.16
    currentY += (latestMotion.y - currentY) * 0.16
    setCardVars(card, currentX, currentY, { damp: activeDamp, opacity: activeOpacity })

    if (Math.abs(latestMotion.x - currentX) > 0.001 || Math.abs(latestMotion.y - currentY) > 0.001) {
      motionFrame = window.requestAnimationFrame(updateMotionFrame)
    }
  }

  const handleOrientation = (event) => {
    if (typeof event.gamma !== 'number' || typeof event.beta !== 'number') return

    latestMotion = {
      x: clamp(0.5 + (event.gamma / 22)),
      y: clamp(0.5 + (event.beta / 30)),
    }

    if (!motionFrame) motionFrame = window.requestAnimationFrame(updateMotionFrame)
  }

  const startMotion = () => {
    if (motionStarted || !canUseMotion) return
    motionStarted = true
    window.addEventListener('deviceorientation', handleOrientation, { passive: true })
  }

  const requestMotion = () => {
    const DeviceOrientation = window.DeviceOrientationEvent
    if (typeof DeviceOrientation?.requestPermission !== 'function') {
      startMotion()
      return
    }

    window.__ggDeviceOrientationPermission ??= DeviceOrientation.requestPermission()
      .then((state) => state === 'granted')
      .catch(() => false)

    window.__ggDeviceOrientationPermission.then((granted) => {
      if (granted) startMotion()
    })
  }

  if (canUseMotion) {
    if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') {
      window.addEventListener('pointerdown', requestMotion, { once: true, passive: true })
      window.addEventListener('touchstart', requestMotion, { once: true, passive: true })
    } else {
      startMotion()
    }
  }

  const handleMove = (event) => {
    if (motionStarted) return
    const bounds = scaler.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
    setCardVars(card, x, y, { damp: activeDamp, opacity: activeOpacity })
  }

  const handleLeave = () => {
    if (motionStarted) return
    setCardVars(card, restX, restY, { damp: restDamp, opacity: restOpacity })
  }

  surface.addEventListener('pointermove', handleMove, { passive: true })
  surface.addEventListener('mousemove', handleMove, { passive: true })
  surface.addEventListener('pointerleave', handleLeave)
  surface.addEventListener('mouseleave', handleLeave)
  window.addEventListener('blur', handleLeave)
  document.addEventListener('visibilitychange', handleLeave)

  return () => {
    surface.removeEventListener('pointermove', handleMove)
    surface.removeEventListener('mousemove', handleMove)
    surface.removeEventListener('pointerleave', handleLeave)
    surface.removeEventListener('mouseleave', handleLeave)
    window.removeEventListener('deviceorientation', handleOrientation)
    window.removeEventListener('pointerdown', requestMotion)
    window.removeEventListener('touchstart', requestMotion)
    if (motionFrame) window.cancelAnimationFrame(motionFrame)
    window.removeEventListener('blur', handleLeave)
    document.removeEventListener('visibilitychange', handleLeave)
  }
}

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
  const adminNavLink = document.querySelector('[data-admin-nav-link="true"]')
  if (!(adminNavLink instanceof HTMLElement)) return
  adminNavLink.hidden = !window.sessionStorage.getItem(adminStorageKey)
}

function initNavMenu() {
  cleanupNavMenu?.()
  cleanupNavMenu = null

  const navToggle = document.querySelector('[data-nav-toggle]')
  const nav = document.querySelector('[data-nav]')

  if (!(navToggle instanceof HTMLButtonElement) || !(nav instanceof HTMLElement)) return

  const syncMenu = (expanded) => {
    navToggle.setAttribute('aria-expanded', String(expanded))
    nav.dataset.open = expanded ? 'true' : 'false'
    document.body.classList.toggle('menu-open', expanded)
  }

  const handleToggleClick = () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true'
    syncMenu(!expanded)
  }

  const handleLinkClick = () => syncMenu(false)
  const handleResize = () => {
    if (window.innerWidth > 720) syncMenu(false)
  }

  navToggle.addEventListener('click', handleToggleClick)
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', handleLinkClick)
  })
  window.addEventListener('resize', handleResize)

  cleanupNavMenu = () => {
    navToggle.removeEventListener('click', handleToggleClick)
    nav.querySelectorAll('a').forEach((link) => {
      link.removeEventListener('click', handleLinkClick)
    })
    window.removeEventListener('resize', handleResize)
  }
}

syncAdminNav()
initNavMenu()
initSiteNoise()
initHeroVideo()
initHeroCardPreview()
document.addEventListener('astro:page-load', () => {
  syncAdminNav()
  initNavMenu()
  initSiteNoise()
  initHeroVideo()
  initHeroCardPreview()
})
document.addEventListener('astro:after-swap', () => {
  requestAnimationFrame(() => {
    syncAdminNav()
    initNavMenu()
    initSiteNoise()
    initHeroVideo()
    initHeroCardPreview()
  })
})
window.addEventListener('storage', syncAdminNav)
window.addEventListener('gg-admin-auth-change', syncAdminNav)

window.addEventListener(
  'beforeunload',
  () => {
    cleanupNoise?.()
    cleanupHeroCardPreview?.()
    cleanupNavMenu?.()
    window.removeEventListener('storage', syncAdminNav)
    window.removeEventListener('gg-admin-auth-change', syncAdminNav)
  },
  { once: true }
)
