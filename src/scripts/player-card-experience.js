import * as THREE from 'three'

const DESIGN_THEMES = {
  'holo-refractor': {
    slab: '#8ccfff',
    emissive: '#5a8cff',
    rim: '#ff77dd',
    halo: '#6df2ff',
    halo2: '#ffe37a',
    particles: ['#7df8ff', '#ab8dff', '#ff6bc8', '#ffe37a'],
  },
  'cosmos': {
    slab: '#5c4fff',
    emissive: '#2a1aff',
    rim: '#00c8ff',
    halo: '#7a5fff',
    halo2: '#00eeff',
    particles: ['#7b5fff', '#00bbff', '#b870ff', '#1a3fff'],
  },
  'gold-sovereign': {
    slab: '#f0d995',
    emissive: '#b9975b',
    rim: '#f6e8bd',
    halo: '#d7b77a',
    halo2: '#fff3c9',
    particles: ['#f7e4b3', '#e2c684', '#fff6dd', '#a37b41'],
  },
  'jersey-patch': {
    slab: '#c0d0e8',
    emissive: '#7a9dbf',
    rim: '#ffffff',
    halo: '#a8c0d8',
    halo2: '#e0eaf5',
    particles: ['#dce8f5', '#a8c0d8', '#ffffff', '#7a9dbf'],
  },
  'comic': {
    slab: '#e8001d',
    emissive: '#cc0018',
    rim: '#ffd600',
    halo: '#0055cc',
    halo2: '#ffd600',
    particles: ['#e8001d', '#ffd600', '#0055cc', '#ffffff'],
  },
  'void': {
    slab: '#6b35ff',
    emissive: '#3a00ff',
    rim: '#cc35ff',
    halo: '#7b35ff',
    halo2: '#cc35ff',
    particles: ['#6b35ff', '#cc35ff', '#3a00ff', '#9955ff'],
  },
  'street': {
    slab: '#0d1f0d',
    emissive: '#1a3d1a',
    rim: '#4aff22',
    halo: '#44ff22',
    halo2: '#aaffaa',
    particles: ['#4aff22', '#88ff66', '#ccff99', '#ffff44'],
  },
  'full-art': {
    slab: '#1a0d28',
    emissive: '#380d6a',
    rim: '#cc77ff',
    halo: '#9944ff',
    halo2: '#ff77cc',
    particles: ['#9944ff', '#cc77ff', '#ff77cc', '#66aaff'],
  },
  'prizm': {
    slab: '#0e1f40',
    emissive: '#0a2a6e',
    rim: '#ff7700',
    halo: '#2277ff',
    halo2: '#ff9922',
    particles: ['#2277ff', '#ff7700', '#4499ff', '#ffaa33'],
  },
  'solar': {
    slab: '#1e0c00',
    emissive: '#4a1a00',
    rim: '#ffcc00',
    halo: '#ff8800',
    halo2: '#ffee66',
    particles: ['#ff8800', '#ffcc00', '#ffee66', '#ff5500'],
  },
  'aurora': {
    slab: '#041810',
    emissive: '#093d28',
    rim: '#ff44cc',
    halo: '#00ffaa',
    halo2: '#44ccff',
    particles: ['#00ffaa', '#44ccff', '#88ffcc', '#cc44ff'],
  },
  'chrome': {
    slab: '#1a1a1a',
    emissive: '#444444',
    rim: '#ffffff',
    halo: '#ccddee',
    halo2: '#ffffff',
    particles: ['#ffffff', '#ccddee', '#aabbcc', '#ddeeff'],
  },
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function hex(color) {
  return new THREE.Color(color)
}

function createParticleCloud(colors) {
  const count = 700
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colorValues = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const stride = index * 3
    const radius = 4.4 + Math.random() * 5.8
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    const color = hex(colors[index % colors.length])

    positions[stride] = radius * Math.sin(phi) * Math.cos(theta)
    positions[stride + 1] = radius * Math.cos(phi) * 0.65
    positions[stride + 2] = radius * Math.sin(phi) * Math.sin(theta)

    colorValues[stride] = color.r
    colorValues[stride + 1] = color.g
    colorValues[stride + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colorValues, 3))

  const material = new THREE.PointsMaterial({
    size: 0.08,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  })

  return new THREE.Points(geometry, material)
}

function createHaloRing(radiusInner, radiusOuter, color, tiltX, tiltY) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radiusInner, radiusOuter, 96),
    new THREE.MeshBasicMaterial({
      color: hex(color),
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )

  ring.rotation.x = tiltX
  ring.rotation.y = tiltY

  return ring
}

function createEnergyBeam(color) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.34, 7.8, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: hex(color),
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )

  beam.rotation.z = Math.PI / 2.8
  beam.position.set(-0.5, 0.45, -1.3)

  return beam
}

function setupThreeScene(sceneHost, stage, card) {
  if (!(sceneHost instanceof HTMLElement && stage instanceof HTMLElement && card instanceof HTMLElement)) {
    return null
  }

  try {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className = 'player-card-scene__canvas'
  sceneHost.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0.15, 8.5)

  const world = new THREE.Group()
  scene.add(world)

  const ambientLight = new THREE.HemisphereLight('#ffffff', '#0e1024', 1.6)
  scene.add(ambientLight)

  const keyLight = new THREE.PointLight('#7df8ff', 17, 30, 2)
  keyLight.position.set(2.8, 1.8, 7)
  scene.add(keyLight)

  const rimLight = new THREE.PointLight('#ff77dd', 12, 28, 2)
  rimLight.position.set(-3.2, -1.8, 4.5)
  scene.add(rimLight)

  const slabMaterial = new THREE.MeshPhysicalMaterial({
    color: hex('#8ccfff'),
    emissive: hex('#5a8cff'),
    emissiveIntensity: 0.42,
    roughness: 0.26,
    metalness: 0.68,
    transmission: 0.14,
    thickness: 0.24,
    transparent: true,
    opacity: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    ior: 1.18,
  })

  const slab = new THREE.Mesh(new THREE.BoxGeometry(3.28, 4.56, 0.2), slabMaterial)
  slab.position.z = -0.08
  world.add(slab)

  const panelGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.04, 4.3),
    new THREE.MeshBasicMaterial({
      color: hex('#7df8ff'),
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  panelGlow.position.z = 0.13
  world.add(panelGlow)

  const ringA = createHaloRing(2.45, 2.83, '#7df8ff', Math.PI / 2.65, 0.18)
  ringA.position.z = -1.4
  world.add(ringA)

  const ringB = createHaloRing(1.78, 2.08, '#ff77dd', Math.PI / 2.28, -0.36)
  ringB.position.set(0.3, -0.15, -0.9)
  world.add(ringB)

  const ringC = createHaloRing(1.1, 1.28, '#ffe37a', Math.PI / 2.9, 0.72)
  ringC.position.set(-0.75, 0.8, -0.4)
  world.add(ringC)

  const beam = createEnergyBeam('#7df8ff')
  world.add(beam)

  const particleCloud = createParticleCloud(DESIGN_THEMES['holo-refractor'].particles)
  particleCloud.position.z = -2.6
  world.add(particleCloud)

  const backBurst = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 32, 32),
    new THREE.MeshBasicMaterial({
      color: hex('#7df8ff'),
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  backBurst.position.set(0, 0.15, -1.8)
  world.add(backBurst)

  // Hide all background geometry — no particles, rings or shapes behind the card
  world.visible = false

  const pointer = { x: 0, y: 0 }
  const target = { x: 0, y: 0 }
  let running = false
  let rafId = 0

  function resize() {
    renderer.setSize(540, 756, false)
    camera.aspect = 540 / 756
    camera.updateProjectionMatrix()
  }

  function applyTheme(designId) {
    const theme = DESIGN_THEMES[designId] || DESIGN_THEMES['holo-refractor']

    slabMaterial.color.copy(hex(theme.slab))
    slabMaterial.emissive.copy(hex(theme.emissive))
    keyLight.color.copy(hex(theme.halo))
    rimLight.color.copy(hex(theme.rim))
    panelGlow.material.color.copy(hex(theme.halo))
    ringA.material.color.copy(hex(theme.halo))
    ringB.material.color.copy(hex(theme.rim))
    ringC.material.color.copy(hex(theme.halo2))
    beam.material.color.copy(hex(theme.halo))
    backBurst.material.color.copy(hex(theme.halo))

    const colors = particleCloud.geometry.getAttribute('color')
    for (let index = 0; index < colors.count; index += 1) {
      const color = hex(theme.particles[index % theme.particles.length])
      colors.setXYZ(index, color.r, color.g, color.b)
    }
    colors.needsUpdate = true
  }

  function renderFrame(time = 0) {
    if (!running) return

    target.x += (pointer.x - target.x) * 0.06
    target.y += (pointer.y - target.y) * 0.06

    world.rotation.y = target.x * 0.3
    world.rotation.x = -target.y * 0.18
    world.position.y = Math.sin(time * 0.0012) * (prefersReducedMotion ? 0.02 : 0.12)

    slab.rotation.y = target.x * 0.36
    slab.rotation.x = -target.y * 0.18
    slab.position.y = Math.sin(time * 0.0016) * (prefersReducedMotion ? 0.03 : 0.16)

    panelGlow.rotation.z += prefersReducedMotion ? 0.0002 : 0.0014
    ringA.rotation.z += prefersReducedMotion ? 0.0003 : 0.0018
    ringB.rotation.z -= prefersReducedMotion ? 0.00025 : 0.0014
    ringC.rotation.z += prefersReducedMotion ? 0.00035 : 0.0022
    particleCloud.rotation.y += prefersReducedMotion ? 0.00018 : 0.0008
    particleCloud.rotation.x = Math.sin(time * 0.0006) * 0.08
    beam.rotation.y = target.x * 0.45

    keyLight.position.x = 2.8 + target.x * 1.8
    keyLight.position.y = 1.8 + target.y * 1.4
    rimLight.position.x = -3.2 - target.x * 1.2
    rimLight.position.y = -1.8 - target.y * 1.1

    renderer.render(scene, camera)
    rafId = window.requestAnimationFrame(renderFrame)
  }

  function start() {
    if (running) return
    running = true
    resize()
    rafId = window.requestAnimationFrame(renderFrame)
  }

  function stop() {
    running = false
    if (rafId) {
      window.cancelAnimationFrame(rafId)
      rafId = 0
    }
    renderer.render(scene, camera)
  }

  function setPointer(clientX, clientY) {
    const rect = sceneHost.getBoundingClientRect()
    pointer.x = clamp((clientX - rect.left) / rect.width, 0, 1) - 0.5
    pointer.y = clamp((clientY - rect.top) / rect.height, 0, 1) - 0.5
  }

  function resetPointer() {
    pointer.x = 0
    pointer.y = 0
  }

  resize()
  applyTheme(card.dataset.design || 'holo-refractor')
  renderer.render(scene, camera)

  return {
    start,
    stop,
    resize,
    setPointer,
    resetPointer,
    applyTheme,
    destroy() {
      stop()
      renderer.dispose()
      slab.geometry.dispose()
      slabMaterial.dispose()
      panelGlow.geometry.dispose()
      panelGlow.material.dispose()
      ringA.geometry.dispose()
      ringA.material.dispose()
      ringB.geometry.dispose()
      ringB.material.dispose()
      ringC.geometry.dispose()
      ringC.material.dispose()
      beam.geometry.dispose()
      beam.material.dispose()
      particleCloud.geometry.dispose()
      particleCloud.material.dispose()
      backBurst.geometry.dispose()
      backBurst.material.dispose()
      sceneHost.replaceChildren()
    },
  }

  } catch {
    return null
  }
}

export function setupPlayerCardExperience() {
  const openButton = document.querySelector('[data-open-player-card]')
  const closeButton = document.querySelector('[data-close-player-card]')
  const modal = document.querySelector('[data-player-card-modal]')
  const card = document.querySelector('[data-player-card]')
  const stage = document.querySelector('[data-player-card-stage]')
  const sceneHost = document.querySelector('[data-player-card-scene]')
  const flipButton = document.querySelector('[data-flip-player-card]')
  const printButton = document.querySelector('[data-print-player-card]')
  const saveDropdown = document.querySelector('[data-save-dropdown]')
  const saveDropdownTrigger = document.querySelector('[data-save-dropdown-trigger]')
  const saveLabel = document.querySelector('[data-save-label]')
  const saveDropdownItems = Array.from(document.querySelectorAll('[data-save-design]'))
  const shareButton = document.querySelector('[data-share-player-card]')
  const shareFeedback = document.querySelector('[data-player-card-feedback]')
  if (
    !(openButton instanceof HTMLButtonElement) ||
    !(closeButton instanceof HTMLButtonElement) ||
    !(modal instanceof HTMLDialogElement) ||
    !(card instanceof HTMLElement) ||
    !(stage instanceof HTMLElement) ||
    !(sceneHost instanceof HTMLElement) ||
    !(flipButton instanceof HTMLButtonElement) ||
    !(printButton instanceof HTMLButtonElement) ||
    !(saveDropdown instanceof HTMLElement) ||
    !(saveDropdownTrigger instanceof HTMLButtonElement) ||
    !(saveLabel instanceof HTMLElement) ||
    !(shareButton instanceof HTMLButtonElement) ||
    !(shareFeedback instanceof HTMLElement)
  ) {
    return
  }

  if (modal.dataset.playerCardEnhanced === 'true') {
    return
  }
  modal.dataset.playerCardEnhanced = 'true'

  const athleteName = modal.dataset.athleteName || 'Player'
  const athleteSport = modal.dataset.athleteSport || 'Sport'
  const athleteTeam = modal.dataset.athleteTeam || 'Team'
  const athleteSlug = modal.dataset.athleteSlug || athleteName.toLowerCase().replace(/\s+/g, '-')
  const shareTitle = `${athleteName} Player Card`
  const shareText = `${athleteName} • ${athleteSport} • ${athleteTeam}`
  const storageKey = `glory-and-game:player-card-design:${athleteSlug}`
  const validDesigns = new Set(
    saveDropdownItems.map((item) => item.dataset.saveDesign).filter(Boolean)
  )

  const sceneController = setupThreeScene(sceneHost, stage, card)

  let animationFrame = 0
  let currentRotateX = 0
  let currentRotateY = 0
  let currentGlareX = 50
  let currentGlareY = 20
  let currentInvertGlareX = 50
  let currentInvertGlareY = 80
  let currentHyp = 0
  let currentCardOpacity = 0
  let targetRotateX = 0
  let targetRotateY = 0
  let targetGlareX = 50
  let targetGlareY = 20
  let targetCardOpacity = 0

  function renderTilt() {
    currentRotateX += (targetRotateX - currentRotateX) * 0.12
    currentRotateY += (targetRotateY - currentRotateY) * 0.12
    currentGlareX += (targetGlareX - currentGlareX) * 0.16
    currentGlareY += (targetGlareY - currentGlareY) * 0.16
    currentInvertGlareX += ((100 - targetGlareX) - currentInvertGlareX) * 0.16
    currentInvertGlareY += ((100 - targetGlareY) - currentInvertGlareY) * 0.16
    currentCardOpacity += (targetCardOpacity - currentCardOpacity) * 0.08

    const glareDistanceX = (currentGlareX - 50) / 50
    const glareDistanceY = (currentGlareY - 50) / 50
    currentHyp += (Math.min(1, Math.hypot(glareDistanceX, glareDistanceY)) - currentHyp) * 0.14

    card.style.setProperty('--card-rotate-x', `${currentRotateX.toFixed(2)}deg`)
    card.style.setProperty('--card-rotate-y', `${currentRotateY.toFixed(2)}deg`)
    card.style.setProperty('--card-glare-x', `${currentGlareX.toFixed(1)}%`)
    card.style.setProperty('--card-glare-y', `${currentGlareY.toFixed(1)}%`)
    card.style.setProperty('--card-pos-x', `${currentGlareX.toFixed(1)}%`)
    card.style.setProperty('--card-pos-y', `${currentGlareY.toFixed(1)}%`)
    card.style.setProperty('--card-pos-x-invert', `${currentInvertGlareX.toFixed(1)}%`)
    card.style.setProperty('--card-pos-y-invert', `${currentInvertGlareY.toFixed(1)}%`)
    card.style.setProperty('--card-hyp', currentHyp.toFixed(3))
    card.style.setProperty('--card-opacity', currentCardOpacity.toFixed(3))
    card.style.setProperty('--pointer-from-left', (currentGlareX / 100).toFixed(3))
    card.style.setProperty('--pointer-from-top', (currentGlareY / 100).toFixed(3))
    // Narrow 37–63% window — used by classic-holo so a 400%-sized gradient
    // shifts dramatically with minimal mouse movement (Simon's technique)
    card.style.setProperty('--background-x', `${(37 + currentGlareX * 0.26).toFixed(2)}%`)
    card.style.setProperty('--background-y', `${(37 + currentGlareY * 0.26).toFixed(2)}%`)
    // Simon's ch-card CSS uses these names directly
    card.style.setProperty('--pointer-x', `${currentGlareX.toFixed(1)}%`)
    card.style.setProperty('--pointer-y', `${currentGlareY.toFixed(1)}%`)
    card.style.setProperty('--pointer-from-center', currentHyp.toFixed(3))

    const shouldContinue =
      Math.abs(targetRotateX - currentRotateX) > 0.02 ||
      Math.abs(targetRotateY - currentRotateY) > 0.02 ||
      Math.abs(targetGlareX - currentGlareX) > 0.05 ||
      Math.abs(targetGlareY - currentGlareY) > 0.05 ||
      Math.abs(targetCardOpacity - currentCardOpacity) > 0.005 ||
      currentHyp > 0.01

    if (shouldContinue) {
      animationFrame = window.requestAnimationFrame(renderTilt)
    } else {
      animationFrame = 0
    }
  }

  function scheduleTilt() {
    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(renderTilt)
    }
  }

  function getShareUrl() {
    const url = new URL(window.location.href)
    url.searchParams.set('card', '3d')
    url.searchParams.set('side', card.dataset.flipped === 'true' ? 'back' : 'front')
    url.searchParams.set('design', card.dataset.design || 'holo-refractor')
    return url.toString()
  }

  function syncCardUrl() {
    const url = new URL(window.location.href)

    if (modal.open) {
      url.searchParams.set('card', '3d')
      url.searchParams.set('side', card.dataset.flipped === 'true' ? 'back' : 'front')
      url.searchParams.set('design', card.dataset.design || 'holo-refractor')
    } else {
      url.searchParams.delete('card')
      url.searchParams.delete('side')
      url.searchParams.delete('design')
    }

    window.history.replaceState({}, '', url)
  }

  function setFlipped(nextValue) {
    card.dataset.flipped = nextValue ? 'true' : 'false'
    if (modal.open) syncCardUrl()
  }

  function resetTilt() {
    targetRotateX = 0
    targetRotateY = 0
    targetGlareX = 50
    targetGlareY = 20
    targetCardOpacity = 0
    sceneController?.resetPointer()
    scheduleTilt()
  }

  function showShareFeedback(message, tone = 'success') {
    shareFeedback.dataset.tone = tone
    shareFeedback.textContent = message
    shareFeedback.hidden = false
    window.setTimeout(() => {
      shareFeedback.hidden = true
    }, 2200)
  }

  function setDesign(nextDesign, { persist = true } = {}) {
    const resolvedDesign = validDesigns.has(nextDesign) ? nextDesign : 'holo-refractor'
    card.dataset.design = resolvedDesign

    const activeItem = saveDropdownItems.find((item) => item.dataset.saveDesign === resolvedDesign)
    if (activeItem) saveLabel.textContent = activeItem.textContent?.trim() || resolvedDesign

    sceneController?.applyTheme(resolvedDesign)
    document.fonts.ready.then(() => window.requestAnimationFrame(fitPrizmName))

    if (resolvedDesign === 'prizm') {
      clearCosmosTheme()
      clearJerseyPatchTheme()
      applyPrizmPalette()
    } else if (resolvedDesign === 'cosmos') {
      card.style.removeProperty('--card-surface')
      clearJerseyPatchTheme()
      // Clear inline styles set by fitPrizmName() so the name reverts to CSS
      const nameEl = card.querySelector('.player-card-face__name')
      if (nameEl instanceof HTMLElement) {
        nameEl.style.removeProperty('font-size')
        nameEl.style.removeProperty('padding-top')
        nameEl.style.removeProperty('padding-bottom')
      }
      applyCosmosTheme()
    } else if (resolvedDesign === 'jersey-patch') {
      clearCosmosTheme()
      clearComicTeamColor()
      card.style.removeProperty('--card-surface')
      applyJerseyPatchTheme()
    } else if (resolvedDesign === 'comic') {
      clearCosmosTheme()
      clearJerseyPatchTheme()
      card.style.removeProperty('--card-surface')
      applyComicTeamColor()
    } else {
      clearCosmosTheme()
      clearJerseyPatchTheme()
      clearComicTeamColor()
      card.style.removeProperty('--card-surface')
      // Clear inline styles set by fitPrizmName() so the name reverts to CSS
      const nameEl = card.querySelector('.player-card-face__name')
      if (nameEl instanceof HTMLElement) {
        nameEl.style.removeProperty('font-size')
        nameEl.style.removeProperty('padding-top')
        nameEl.style.removeProperty('padding-bottom')
      }
    }

    // Apply the HC mask for every design — CSS decides per-design which layers
    // use it. Classic Holo sets it on .ch-card; all others read from .player-card-face--front.
    applyEtchOverlay()

    if (persist) {
      window.localStorage.setItem(storageKey, resolvedDesign)
    }

    if (modal.open) syncCardUrl()
  }

  // Extract dominant vibrant colors from a player photo via canvas
  // ── Classic-Holo etch overlay ─────────────────────────────────────────────
  // Generates a separate high-contrast edge-detected image from the player
  // photo — the same concept as poke-holo's pre-baked etched .webp files,
  // but done client-side via Canvas. The data URL is set as the etch img src.
  function generateEtchImage(imgEl) {
    const W = imgEl.naturalWidth  || 400
    const H = imgEl.naturalHeight || 560
    const canvas = document.createElement('canvas')
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    try {
      // Luminosity mask: grayscale + high contrast so bright areas of the photo
      // (jersey highlights, skin, face) become white and dark areas become black.
      // White areas let the holo effects through via CSS mask-image; black hides them.
      ctx.filter = 'grayscale(1) contrast(3) brightness(1.3)'
      ctx.drawImage(imgEl, 0, 0, W, H)
      ctx.filter = 'none'

      // Second pass: invert so the silhouette (dark subject) becomes the mask.
      // Boost contrast further so we get near-binary black/white output.
      const src = ctx.getImageData(0, 0, W, H)
      const dst = ctx.createImageData(W, H)
      const d = src.data, o = dst.data

      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
        // Sigmoid-like curve: push midtones toward the extremes
        const t = lum / 255
        const curved = Math.pow(t, 0.6) * 255
        o[i] = o[i + 1] = o[i + 2] = Math.min(255, curved)
        o[i + 3] = 255
      }
      ctx.putImageData(dst, 0, 0)
      return canvas.toDataURL('image/webp', 0.85)
    } catch {
      return null // CORS blocked — graceful fallback, card still works
    }
  }

  function applyEtchOverlay() {
    const chCard     = card.querySelector('.ch-card')
    const designCard = card.querySelector('.design-card')
    const imgEl      = card.querySelector('.player-card-face__media img')
    if (!(chCard instanceof HTMLElement) || !(imgEl instanceof HTMLImageElement)) return

    const applyMask = (url) => {
      const value = `url(${url})`
      // .ch-card consumes --mask for Classic Holo.
      // .design-card consumes it for all other designs.
      chCard.style.setProperty('--mask', value)
      if (designCard instanceof HTMLElement) designCard.style.setProperty('--mask', value)
    }

    const clearMask = () => {
      chCard.style.removeProperty('--mask')
      if (designCard instanceof HTMLElement) designCard.style.removeProperty('--mask')
    }

    // Production: blob URL resolved at SSR time and stamped as data-mask-url.
    // Local dev fallback: probe the static path built from the athlete slug.
    const blobUrl = chCard.dataset.maskUrl
    if (blobUrl) {
      applyMask(blobUrl)
      return
    }

    const staticPath = `/assets/athletes/${athleteSlug}-hc.png`
    const probe = new Image()
    probe.onload = () => applyMask(staticPath)
    probe.onerror = () => clearMask()
    probe.src = staticPath
  }
  // ─────────────────────────────────────────────────────────────────────────

  // allowRed=false (Prizm): hard-cuts warm/red to avoid skin tones and arena lights
  // allowRed=true (Cosmos): keeps vivid reds (team colors) but uses higher sat threshold
  //   to filter skin — skin typically has sat < 0.45, vivid team red has sat ~0.8+
  // centerFocus=true (Cosmos): draws only the central 55% of the image to avoid
  //   crowd/arena edges and focus on the jersey torso where team colors live
  function extractImageColors(imgEl, { allowRed = false, centerFocus = false } = {}) {
    const W = 60, H = 84
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    try {
      if (centerFocus) {
        // Sample from the central 55% of the image (jersey/torso zone)
        const sw = imgEl.naturalWidth  || imgEl.width  || 400
        const sh = imgEl.naturalHeight || imgEl.height || 560
        const cx = sw * 0.22, cy = sh * 0.18
        const cw = sw * 0.56, ch = sh * 0.62
        ctx.drawImage(imgEl, cx, cy, cw, ch, 0, 0, W, H)
      } else {
        ctx.drawImage(imgEl, 0, 0, W, H)
      }
      const { data } = ctx.getImageData(0, 0, W, H)

      function sample(skipWarm) {
        const out = []
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          if (lum < 14 || lum > 234) continue
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const sat = max > 0 ? (max - min) / max : 0

          if (allowRed) {
            // Higher saturation floor (0.42) eliminates most neutral greys and
            // near-grey arena surfaces without discarding vivid team colors.
            // Brown/skin filter: ANY warm-dominant pixel (r >= max(g,b)) with sat < 0.75
            // is treated as skin or brown and discarded. Vivid team reds/oranges
            // (Hurricanes red, Knicks orange, etc.) have sat ~0.85–1.0 and pass cleanly.
            // This handles the full skin tone range from pale to very dark.
            if (sat < 0.42) continue
            const warmDominant = r >= Math.max(g, b)
            const isBrownOrSkin = warmDominant && sat < 0.75 && lum > 30 && lum < 220
            if (isBrownOrSkin) continue
          } else {
            if (sat < 0.12) continue
            if (skipWarm) {
              // Hard-cut any pixel where red clearly beats both other channels —
              // this eliminates arena orange, warm stage lights, and skin tones
              // (blues, greens, purples, teals all pass through fine)
              if (r > Math.max(g, b) + 40) continue
            }
          }

          // Score: vibrancy + small lum bonus, minus residual warm-red penalty
          // (warmPenalty is 0 for allowRed mode since we want reds to compete)
          const warmPenalty = allowRed ? 0 : Math.max(0, r - Math.max(g, b)) / 255
          const score = sat * 0.75 + lum / 800 - warmPenalty * 0.5

          out.push({ r, g, b, sat, lum, score })
        }
        return out
      }

      let candidates
      if (allowRed) {
        // Single pass — no warm bias, high-sat filter handles skin
        candidates = sample(false)
      } else {
        // First pass: hard-cut warm/red pixels so jersey colours win
        candidates = sample(true)
        // Fallback: if the photo is genuinely warm-dominant (e.g. gold uniform), allow everything
        if (candidates.length < 6) candidates = sample(false)
      }
      if (candidates.length < 4) return null

      // Sort by vibrancy minus warm penalty
      candidates.sort((a, b) => b.score - a.score)

      // Pick up to 3 perceptually distinct colors
      const picked = []
      for (const c of candidates) {
        if (picked.length >= 3) break
        const distinct = picked.every(({ r, g, b }) => {
          const dr = c.r - r, dg = c.g - g, db = c.b - b
          return Math.sqrt(dr * dr + dg * dg + db * db) > 80
        })
        if (distinct) picked.push(c)
      }
      return picked.length >= 2 ? picked : null
    } catch {
      return null // CORS failure — fall back to default theme colors
    }
  }

  // Apply the extracted photo palette to the Prizm card surface + Three.js scene
  function applyPrizmPalette() {
    if (card.dataset.design !== 'prizm') return
    const imgEl = card.querySelector('.player-card-face__media img')
    if (!(imgEl instanceof HTMLImageElement)) return

    const run = () => {
      const colors = extractImageColors(imgEl)
      if (!colors) return

      const [c1, c2, c3] = colors
      const rgba = ({ r, g, b }, a) => `rgba(${r},${g},${b},${a})`
      const hex  = ({ r, g, b }) =>
        '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

      // Drive the card surface blobs from the photo palette
      card.style.setProperty('--card-surface', [
        `radial-gradient(ellipse at 25% 25%, ${rgba(c1, 0.42)}, transparent 55%)`,
        `radial-gradient(ellipse at 76% 74%, ${rgba(c2, 0.34)}, transparent 50%)`,
        c3 ? `radial-gradient(ellipse at 58% 12%, ${rgba(c3, 0.2)}, transparent 42%)` : '',
        `linear-gradient(155deg, #04060e 0%, #080c1c 50%, #04060e 100%)`,
      ].filter(Boolean).join(', '))

      // Also drive the Three.js scene (hover glow/halo/rim/particles)
      sceneController?.applyTheme({
        ...DESIGN_THEMES['prizm'],
        slab:      hex(c1),
        emissive:  hex(c2),
        halo:      hex(c1),
        halo2:     hex(c2),
        rim:       hex(c3 ?? c2),
        particles: [hex(c1), hex(c2), hex(c3 ?? c1), hex(c2)],
      })
    }

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      run()
    } else {
      imgEl.addEventListener('load', run, { once: true })
    }
  }

  // Apply extracted jersey colors to the Deep Space (cosmos) card.
  // Same technique as applyPrizmPalette — canvas color extraction drives both
  // the CSS nebula surface and the Three.js halo/particle/rim colors.
  function applyCosmosTheme() {
    if (card.dataset.design !== 'cosmos') return
    const imgEl = card.querySelector('.player-card-face__media img')
    if (!(imgEl instanceof HTMLImageElement)) return

    const run = () => {
      const colors = extractImageColors(imgEl, { allowRed: true, centerFocus: true })
      if (!colors) return

      const [c1, c2, c3] = colors
      const rgba = ({ r, g, b }, a) => `rgba(${r},${g},${b},${a})`
      const toHex = ({ r, g, b }) =>
        '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

      // Keep the very dark cosmic base; tint nebula blobs with team jersey colors
      card.style.setProperty('--card-surface', [
        `radial-gradient(ellipse at 28% 32%, ${rgba(c1, 0.44)}, transparent 52%)`,
        `radial-gradient(ellipse at 72% 18%, ${rgba(c2, 0.32)}, transparent 48%)`,
        `radial-gradient(ellipse at 50% 82%, ${rgba(c3 ?? c1, 0.24)}, transparent 42%)`,
        `radial-gradient(ellipse at 80% 65%, ${rgba(c2, 0.16)}, transparent 34%)`,
        `linear-gradient(155deg, #04020e 0%, #0a0525 38%, #060418 65%, #0d0828 100%)`,
      ].join(', '))

      // Inner ring border: primary jersey color
      card.style.setProperty('--cosmos-ring', rgba(c1, 1))
      card.style.setProperty('--cosmos-ring-inner', rgba(c1, 0.5))
      card.style.setProperty('--cosmos-ring-glow', rgba(c1, 0.55))
      card.style.setProperty('--cosmos-ring-glow-2', rgba(c1, 0.25))

      // Bottom text box: very dark tint of primary color (~14% brightness) for readability
      const dr = Math.round(c1.r * 0.14), dg = Math.round(c1.g * 0.14), db = Math.round(c1.b * 0.14)
      const dr2 = Math.round(c1.r * 0.09), dg2 = Math.round(c1.g * 0.09), db2 = Math.round(c1.b * 0.09)
      card.style.setProperty('--cosmos-box-bg',          `rgba(${dr}, ${dg}, ${db}, 0.88)`)
      card.style.setProperty('--cosmos-box-bg-2',        `rgba(${dr2}, ${dg2}, ${db2}, 0.93)`)
      card.style.setProperty('--cosmos-box-border',      rgba(c1, 0.35))
      card.style.setProperty('--cosmos-box-glow',        rgba(c1, 0.22))
      card.style.setProperty('--cosmos-box-inset-top',   rgba(c1, 0.14))
      card.style.setProperty('--cosmos-box-inset-bottom',rgba(c1, 0.1))
      card.style.setProperty('--cosmos-text-glow',       rgba(c1, 0.92))
      card.style.setProperty('--cosmos-text-glow-2',     rgba(c2, 0.55))
      card.style.setProperty('--cosmos-team-color',      rgba(c1, 0.82))

      // Accent colors (name chrome, text highlights)
      card.style.setProperty('--card-accent', toHex(c1))
      card.style.setProperty('--card-accent-2', toHex(c2))

      // Three.js scene: halo rings, lights, particle cloud
      sceneController?.applyTheme({
        ...DESIGN_THEMES['cosmos'],
        slab:      toHex(c1),
        emissive:  toHex(c2),
        halo:      toHex(c1),
        halo2:     toHex(c2),
        rim:       toHex(c3 ?? c2),
        particles: [toHex(c1), toHex(c2), toHex(c3 ?? c1), toHex(c2)],
      })
    }

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      run()
    } else {
      imgEl.addEventListener('load', run, { once: true })
    }
  }

  function clearCosmosTheme() {
    for (const prop of [
      '--cosmos-ring', '--cosmos-ring-inner', '--cosmos-ring-glow', '--cosmos-ring-glow-2',
      '--cosmos-box-bg', '--cosmos-box-bg-2', '--cosmos-box-border', '--cosmos-box-glow',
      '--cosmos-box-inset-top', '--cosmos-box-inset-bottom',
      '--cosmos-text-glow', '--cosmos-text-glow-2', '--cosmos-team-color',
      '--card-accent', '--card-accent-2',
    ]) {
      card.style.removeProperty(prop)
    }
  }

  // ── Team color lookup — primary brand color for every NFL/NBA/NHL/MLB franchise ──
  // Keys are matched via String.includes() against the athlete's team field,
  // so partial matches like "NY Yankees" work alongside "New York Yankees".
  const TEAM_COLORS = {
    // ── NFL ─────────────────────────────────────────────────────────────────
    'Arizona Cardinals':       '#97233F',
    'Atlanta Falcons':         '#A71930',
    'Baltimore Ravens':        '#241773',
    'Buffalo Bills':           '#00338D',
    'Carolina Panthers':       '#0085CA',
    'Chicago Bears':           '#C83803',
    'Cincinnati Bengals':      '#FB4F14',
    'Cleveland Browns':        '#FF3C00',
    'Dallas Cowboys':          '#003594',
    'Denver Broncos':          '#FB4F14',
    'Detroit Lions':           '#0076B6',
    'Green Bay Packers':       '#203731',
    'Houston Texans':          '#03202F',
    'Indianapolis Colts':      '#002C5F',
    'Jacksonville Jaguars':    '#006778',
    'Kansas City Chiefs':      '#E31837',
    'Las Vegas Raiders':       '#A5ACAF',
    'Los Angeles Chargers':    '#0080C6',
    'Los Angeles Rams':        '#003594',
    'Miami Dolphins':          '#008E97',
    'Minnesota Vikings':       '#4F2683',
    'New England Patriots':    '#002244',
    'New Orleans Saints':      '#D3BC8D',
    'NY Giants':               '#0B2265',
    'New York Giants':         '#0B2265',
    'NY Jets':                 '#125740',
    'New York Jets':           '#125740',
    'Philadelphia Eagles':     '#004C54',
    'Pittsburgh Steelers':     '#FFB612',
    'San Francisco 49ers':     '#AA0000',
    'Seattle Seahawks':        '#002244',
    'Tampa Bay Buccaneers':    '#D50A0A',
    'Tennessee Titans':        '#0C2340',
    'Tennesee Titans':         '#0C2340',
    'Washington Commanders':   '#5A1414',
    'Washington Redskins':     '#5A1414',
    // ── NBA ─────────────────────────────────────────────────────────────────
    'Atlanta Hawks':           '#E03A3E',
    'Boston Celtics':          '#007A33',
    'Brooklyn Nets':           '#000000',
    'Charlotte Hornets':       '#1D1160',
    'Chicago Bulls':           '#CE1141',
    'Cleveland Cavaliers':     '#860038',
    'Dallas Mavericks':        '#00538C',
    'Denver Nuggets':          '#0E2240',
    'Detroit Pistons':         '#C8102E',
    'Golden State Warriors':   '#1D428A',
    'Houston Rockets':         '#CE1141',
    'Indiana Pacers':          '#002D62',
    'LA Clippers':             '#C8102E',
    'Los Angeles Clippers':    '#C8102E',
    'Los Angeles Lakers':      '#552583',
    'Memphis Grizzlies':       '#5D76A9',
    'Miami Heat':              '#98002E',
    'Milwaukee Bucks':         '#00471B',
    'Minnesota Timberwolves':  '#0C2340',
    'New Orleans Pelicans':    '#0C2340',
    'NY Knicks':               '#006BB6',
    'New York Knicks':         '#006BB6',
    'Oklahoma City Thunder':   '#007AC1',
    'Orlando Magic':           '#0077C0',
    'Philadelphia 76ers':      '#006BB6',
    'Phoenix Suns':            '#1D1160',
    'Portland Trail Blazers':  '#E03A3E',
    'Sacramento Kings':        '#5A2D81',
    'San Antonio Spurs':       '#000000',
    'Toronto Raptors':         '#CE1141',
    'Utah Jazz':               '#002B5C',
    'Washington Wizards':      '#002B5C',
    // ── NHL ─────────────────────────────────────────────────────────────────
    'Anaheim Ducks':           '#F47A38',
    'Boston Bruins':           '#FFB81C',
    'Buffalo Sabres':          '#003087',
    'Calgary Flames':          '#C8102E',
    'Carolina Hurricanes':     '#CC0000',
    'Chicago Blackhawks':      '#CF0A2C',
    'Colorado Avalanche':      '#6F263D',
    'Columbus Blue Jackets':   '#002654',
    'Dallas Stars':            '#006847',
    'Detroit Red Wings':       '#CE1126',
    'Edmonton Oilers':         '#FF4C00',
    'Florida Panthers':        '#041E42',
    'Los Angeles Kings':       '#111111',
    'Minnesota Wild':          '#154734',
    'Montreal Canadiens':      '#AF1E2D',
    'Nashville Predators':     '#FFB81C',
    'New Jersey Devils':       '#CE1126',
    'New York Islanders':      '#00539B',
    'New York Rangers':        '#0038A8',
    'Ottawa Senators':         '#C52032',
    'Philadelphia Flyers':     '#F74902',
    'Pittsburgh Penguins':     '#CFC493',
    'San Jose Sharks':         '#006D75',
    'Seattle Kraken':          '#001628',
    'St. Louis Blues':         '#002F87',
    'Tampa Bay Lightning':     '#002868',
    'Toronto Maple Leafs':     '#00205B',
    'Utah Hockey Club':        '#6CACE4',
    'Vancouver Canucks':       '#00843D',
    'Vegas Golden Knights':    '#B4975A',
    'Washington Capitals':     '#C8102E',
    'Winnipeg Jets':           '#041E42',
    // ── MLB ─────────────────────────────────────────────────────────────────
    'Arizona Diamondbacks':    '#A71930',
    'Atlanta Braves':          '#CE1141',
    'Baltimore Orioles':       '#DF4601',
    'Boston Red Sox':          '#BD3039',
    'Chicago Cubs':            '#0E3386',
    'Chicago White Sox':       '#27251F',
    'Cincinnati Reds':         '#C6011F',
    'Cleveland Guardians':     '#E31937',
    'Colorado Rockies':        '#333366',
    'Detroit Tigers':          '#0C2340',
    'Houston Astros':          '#002D62',
    'Kansas City Royals':      '#004687',
    'Los Angeles Angels':      '#BA0021',
    'Los Angeles Dodgers':     '#005A9C',
    'Miami Marlins':           '#00A3E0',
    'Milwaukee Brewers':       '#12284B',
    'Minnesota Twins':         '#002B5C',
    'NY Mets':                 '#002D72',
    'New York Mets':           '#002D72',
    'NY Yankees':              '#132448',
    'New York Yankees':        '#132448',
    'Oakland Athletics':       '#003831',
    'Philadelphia Phillies':   '#E81828',
    'Pittsburgh Pirates':      '#FDB827',
    'San Diego Padres':        '#2F241D',
    'San Francisco Giants':    '#FD5A1E',
    'Seattle Mariners':        '#0C2C56',
    'St. Louis Cardinals':     '#C41E3A',
    'Tampa Bay Rays':          '#092C5C',
    'Texas Rangers':           '#003278',
    'Toronto Blue Jays':       '#134A8E',
    'Washington Nationals':    '#AB0003',
    // ── International / Soccer ───────────────────────────────────────────────
    'Arsenal':                 '#EF0107',
    'Chelsea':                 '#034694',
    'Manchester City':         '#6CABDD',
    'Manchester United':       '#DA291C',
    'Liverpool':               '#C8102E',
    'Real Madrid':             '#FEBE10',
    'Barcelona':               '#A50044',
    'Dutch National Team':     '#FF6600',
    'Venezuela National Team': '#CF142B',
    'New Zealand':             '#000000',
    'India National Team':     '#003087',
    'USA Soccer':              '#002868',
    'USA':                     '#002868',
    // ── NCAA — verified from teamcolorcodes.com ──────────────────────────────
    // Longer/more-specific names must appear before shorter ones so the
    // length-sorted lookup (see lookupTeamColor) resolves correctly.
    'Alabama':                 '#9E1B32',
    'App State':               '#FFCC00',
    'Appalachian State':       '#FFCC00',
    'Arizona State':           '#8C1D40',
    'Auburn Tigers':           '#0C2340',
    'Auburn':                  '#0C2340',
    'Baylor':                  '#154734',
    'BYU':                     '#002E5D',
    'Clemson':                 '#F66733',
    'Colorado':                '#CFB87C',
    'Duke':                    '#003087',
    'Florida State':           '#782F40',
    'Florida Gators':          '#0021A5',
    'Florida':                 '#0021A5',
    'Georgia Tech':            '#B3A369',
    'Georgia':                 '#BA0C2F',
    'Indiana Hoosiers':        '#990000',
    'Indiana':                 '#990000',
    'Iowa State':              '#C8102E',
    'Iowa':                    '#FFCD00',
    'Kansas State':            '#512888',
    'Kansas':                  '#0051BA',
    'Kentucky':                '#0033A0',
    'Louisville':              '#AD0000',
    'LSU':                     '#461D7C',
    'Miami (FL)':              '#F47321',
    'University of Miami':     '#F47321',
    'Michigan State':          '#18453B',
    'Michigan':                '#00274C',
    'Mississippi State':       '#660000',
    'Missouri':                '#F1B300',
    'NC State':                '#CC0000',
    'Nebraska':                '#E41C38',
    'North Carolina':          '#4B9CD3',
    'Northwestern':            '#4E2A84',
    'Notre Dame':              '#0C2340',
    'Ohio State':              '#BB0000',
    'Oklahoma State':          '#FF7300',
    'Oklahoma':                '#841617',
    'Old Miss':                '#CE1126',
    'Ole Miss':                '#CE1126',
    'Oregon State':            '#DC4405',
    'Oregon Ducks':            '#154733',
    'Oregon':                  '#154733',
    'Penn State':              '#041E42',
    'Pittsburgh Panthers':     '#003594',
    'Purdue':                  '#CFB991',
    'Santa Clara':             '#862633',
    'Stanford':                '#8C1515',
    'TCU':                     '#4D1979',
    'Tennessee':               '#FF8200',
    'Texas A&M':               '#500000',
    'Texas Tech':              '#CC0000',
    'Texas Longhorns':         '#BF5700',
    'University of Texas':     '#BF5700',
    'Texas':                   '#BF5700',
    'UCLA':                    '#2D68C4',
    'USC':                     '#990000',
    'Utah':                    '#CC0000',
    'Vanderbilt':              '#000000',
    'Virginia Tech':           '#630031',
    'Virginia':                '#232D4B',
    'Wake Forest':             '#9E7E38',
    'Washington State':        '#981E32',
    'Washington Huskies':      '#4B2E83',
    'Washington':              '#4B2E83',
    'Wisconsin':               '#C5050C',
  }

  /** Return the brand hex for any team string, or null if unknown.
   *  Sorts by key length descending so "Texas A&M" matches before "Texas",
   *  "Michigan State" before "Michigan", "Georgia Tech" before "Georgia", etc. */
  function lookupTeamColor(teamStr) {
    const entries = Object.entries(TEAM_COLORS).sort((a, b) => b[0].length - a[0].length)
    for (const [name, hex] of entries) {
      if (teamStr.includes(name)) return hex
    }
    return null
  }

  /** Parse a CSS hex color into {r,g,b}. */
  function hexToRgbObj(hex) {
    const n = parseInt(hex.replace('#', ''), 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }

  // Apply extracted jersey colors to the fabric swatch on the Jersey Patch card.
  // Checks the team color lookup first; falls back to image extraction.
  function applyJerseyPatchTheme() {
    if (card.dataset.design !== 'jersey-patch') return
    const imgEl = card.querySelector('.player-card-face__media img')
    if (!(imgEl instanceof HTMLImageElement)) return

    const rgba = ({ r, g, b }, a) => `rgba(${r},${g},${b},${a})`
    const toHex = ({ r, g, b }) =>
      '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

    // ── 1. Try brand color lookup ──────────────────────────────────────────
    const teamStr = card.querySelector('.player-card-face__team')?.textContent?.trim() ?? ''
    const brandHex = lookupTeamColor(teamStr)

    if (brandHex) {
      const c1 = hexToRgbObj(brandHex)
      card.style.setProperty('--patch-color', brandHex)
      card.style.setProperty('--patch-border', rgba(c1, 0.5))
      card.style.setProperty('--patch-glow',   rgba(c1, 0.3))
      card.style.setProperty('--patch-ring',   rgba(c1, 0.2))
      sceneController?.applyTheme({
        ...DESIGN_THEMES['jersey-patch'],
        slab:      brandHex,
        emissive:  brandHex,
        halo:      brandHex,
        halo2:     brandHex,
        rim:       brandHex,
        particles: [brandHex, brandHex, brandHex, brandHex],
      })
      return
    }

    // ── 2. Fallback: extract color from jersey image ───────────────────────
    const run = () => {
      const colors = extractImageColors(imgEl, { allowRed: true, centerFocus: true })
      if (!colors) return

      const [c1, c2, c3] = colors

      // Raw jersey color as the swatch background-color
      card.style.setProperty('--patch-color', `rgb(${c1.r},${c1.g},${c1.b})`)

      // Border, glow, and divider line driven by primary jersey color
      card.style.setProperty('--patch-border', rgba(c1, 0.5))
      card.style.setProperty('--patch-glow',   rgba(c1, 0.3))
      card.style.setProperty('--patch-ring',   rgba(c2, 0.2))

      // Three.js scene: halo rings, lights, particle cloud
      sceneController?.applyTheme({
        ...DESIGN_THEMES['jersey-patch'],
        slab:      toHex(c1),
        emissive:  toHex(c2),
        halo:      toHex(c1),
        halo2:     toHex(c2),
        rim:       toHex(c3 ?? c2),
        particles: [toHex(c1), toHex(c2), toHex(c3 ?? c1), toHex(c2)],
      })
    }

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      run()
    } else {
      imgEl.addEventListener('load', run, { once: true })
    }
  }

  function clearJerseyPatchTheme() {
    for (const prop of ['--patch-color', '--patch-border', '--patch-glow', '--patch-ring']) {
      card.style.removeProperty(prop)
    }
  }

  // Recolor comic rays by fetching the SVG, substituting #FCB316 (ray fill only)
  // with the team color, and setting the result as a blob URL on the sparkle layer.
  // This avoids any overlay/z-index issues — it's a pure color swap in the vector.
  async function recolorComicRays(teamColor) {
    if (card.dataset.design !== 'comic') return
    const sparkle = card.querySelector('.player-card-face__sparkle')
    if (!(sparkle instanceof HTMLElement)) return

    try {
      const res = await fetch('/assets/fabric/orange-comic.svg')
      const svg = await res.text()
      // #FCB316 is used exclusively for the ray paths — safe to replace globally
      const recolored = svg.replace(/fill="#FCB316"/g, `fill="${teamColor}"`)
      const blob = new Blob([recolored], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)

      // Revoke previous blob URL if any
      if (sparkle._comicBlobUrl) URL.revokeObjectURL(sparkle._comicBlobUrl)
      sparkle._comicBlobUrl = url
      sparkle.style.backgroundImage = `url('${url}')`
    } catch (e) {
      // Silently fall back to the original SVG on fetch failure
    }
  }

  function applyComicTeamColor() {
    if (card.dataset.design !== 'comic') return
    const imgEl = card.querySelector('.player-card-face__media img')
    if (!(imgEl instanceof HTMLImageElement)) return

    const teamStr = card.querySelector('.player-card-face__team')?.textContent?.trim() ?? ''
    const brandHex = lookupTeamColor(teamStr)

    if (brandHex) {
      recolorComicRays(brandHex)
      return
    }

    const run = () => {
      const colors = extractImageColors(imgEl, { allowRed: true, centerFocus: true })
      if (!colors) return
      const [c1] = colors
      recolorComicRays(`rgb(${c1.r},${c1.g},${c1.b})`)
    }

    if (imgEl.complete && imgEl.naturalWidth > 0) run()
    else imgEl.addEventListener('load', run, { once: true })
  }

  function clearComicTeamColor() {
    const sparkle = card.querySelector('.player-card-face__sparkle')
    if (sparkle instanceof HTMLElement) {
      sparkle.style.removeProperty('background-image')
      if (sparkle._comicBlobUrl) {
        URL.revokeObjectURL(sparkle._comicBlobUrl)
        sparkle._comicBlobUrl = null
      }
    }
  }

  function fitPrizmName() {
    if (card.dataset.design !== 'prizm') return
    const nameEl = card.querySelector('.player-card-face__name')
    const ticket = card.querySelector('.player-card-face__bottom-ticket')
    if (!(nameEl instanceof HTMLElement) || !(ticket instanceof HTMLElement)) return

    // Reset inline size so getComputedStyle returns the CSS baseline
    nameEl.style.fontSize = ''

    const available = ticket.clientWidth - 52 // 20px padding each side + 6px safety buffer
    if (available <= 0) return

    const cs = window.getComputedStyle(nameEl)
    const baseSize = parseFloat(cs.fontSize)
    const fontFamily = cs.fontFamily
    const text = nameEl.textContent?.trim() || ''
    if (!text) return

    // Canvas measurement — immune to DOM layout / overflow / clone font-loading quirks
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = `${baseSize}px ${fontFamily}`
    const baseMetrics = ctx.measureText(text)
    const naturalWidth = baseMetrics.width
    if (naturalWidth <= 0) return

    // Width-only scaling — fill edge to edge
    const scaled = Math.min(Math.max((available / naturalWidth) * baseSize * 0.97, 22), 160)
    nameEl.style.fontSize = `${scaled.toFixed(1)}px`

    // Measure actual glyph bounds at the scaled size and set padding so the ink
    // is fully contained within the element box (card face overflow:hidden won't clip)
    ctx.font = `${scaled}px ${fontFamily}`
    const scaledMetrics = ctx.measureText(text)
    const inkAbove = scaledMetrics.actualBoundingBoxAscent  ?? scaled * 0.85
    const inkBelow = scaledMetrics.actualBoundingBoxDescent ?? scaled * 0.25
    // font-size is the line box; ascent from CSS baseline ≈ scaled * 0.8 for most fonts
    const cssAscent = scaled * 0.8
    const extraTop    = Math.max(0, inkAbove - cssAscent) + 4
    const extraBottom = Math.max(0, inkBelow) + 6
    nameEl.style.paddingTop    = `${extraTop.toFixed(1)}px`
    nameEl.style.paddingBottom = `${extraBottom.toFixed(1)}px`
  }

  function openModal() {
    if (!modal.open) {
      modal.showModal()
    }
    resetTilt()
    syncCardUrl()
    sceneController?.start()
    sceneController?.resize()
    document.fonts.ready.then(() => window.requestAnimationFrame(fitPrizmName))
    applyPrizmPalette()
    applyCosmosTheme()
    applyJerseyPatchTheme()
    applyComicTeamColor()
    if (card.dataset.design === 'classic-holo') applyEtchOverlay()
  }

  openButton.addEventListener('click', openModal)

  closeButton.addEventListener('click', () => {
    modal.close()
  })

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.close()
    }
  })

  flipButton.addEventListener('click', () => {
    setFlipped(card.dataset.flipped !== 'true')
  })

  printButton.addEventListener('click', () => {
    document.body.dataset.printPlayerCard = 'true'
    window.print()
    window.setTimeout(() => {
      delete document.body.dataset.printPlayerCard
    }, 120)
  })

  card.addEventListener('click', (event) => {
    const target = event.target

    if (target instanceof Element && target.closest('a, button')) {
      return
    }

    setFlipped(card.dataset.flipped !== 'true')
  })

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    targetRotateY = (x - 0.5) * 32
    targetRotateX = (0.5 - y) * 26
    targetGlareX = x * 100
    targetGlareY = y * 100
    targetCardOpacity = 1

    sceneController?.setPointer(event.clientX, event.clientY)
    scheduleTilt()
  })

  stage.addEventListener('pointerleave', () => {
    resetTilt()
  })

  async function saveCardAsImage(design) {
    const slug = athleteSlug || 'card'
    try {
      showShareFeedback('Creating screenshot…', 'success')
      saveDropdownTrigger.disabled = true

      const params = new URLSearchParams({ slug, design })
      const response = await fetch(`/api/card-screenshot?${params}`)

      if (!response.ok) {
        let msg = `Server error ${response.status}`
        try {
          const body = await response.json()
          if (body?.error) msg = body.error
        } catch {}
        throw new Error(msg)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${slug}-${design}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

      showShareFeedback('Image saved.', 'success')
    } catch (err) {
      console.error('[Save card]', err)
      showShareFeedback('Could not save image.', 'error')
    } finally {
      saveDropdownTrigger.disabled = false
    }
  }

  saveDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation()
    const isOpen = saveDropdown.hasAttribute('data-open')
    if (isOpen) {
      saveDropdown.removeAttribute('data-open')
      saveDropdownTrigger.setAttribute('aria-expanded', 'false')
    } else {
      saveDropdown.setAttribute('data-open', '')
      saveDropdownTrigger.setAttribute('aria-expanded', 'true')
    }
  })

  saveDropdownItems.forEach((item) => {
    item.addEventListener('click', () => {
      const design = item.dataset.saveDesign || 'holo-refractor'
      saveDropdown.removeAttribute('data-open')
      saveDropdownTrigger.setAttribute('aria-expanded', 'false')
      setDesign(design)
    })
  })

  document.addEventListener('click', (e) => {
    if (!saveDropdown.contains(e.target)) {
      saveDropdown.removeAttribute('data-open')
      saveDropdownTrigger.setAttribute('aria-expanded', 'false')
    }
  })

  shareButton.addEventListener('click', async () => {
    const shareUrl = getShareUrl()

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        showShareFeedback('Player card shared.', 'success')
        return
      }

      await navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${shareUrl}`)
      showShareFeedback('Share link copied to clipboard.', 'success')
    } catch {
      showShareFeedback('Could not share this card right now.', 'error')
    }
  })

  modal.addEventListener('close', () => {
    resetTilt()
    syncCardUrl()
    sceneController?.stop()
  })

  // ── Carousel navigation ──────────────────────────────────────────────────
  const carousel = document.querySelector('[data-player-card-carousel]')
  const carouselPrevBtn = document.querySelector('[data-carousel-prev]')
  const carouselNextBtn = document.querySelector('[data-carousel-next]')

  function navigateCarousel(direction) {
    if (!carousel) return
    const slug = direction === 'next'
      ? carousel.dataset.nextSlug
      : carousel.dataset.prevSlug
    if (!slug) return

    const currentDesign = card.dataset.design || 'holo-refractor'
    const url = new URL(`/athletes/${slug}`, window.location.origin)
    url.searchParams.set('card', '3d')
    url.searchParams.set('design', currentDesign)
    url.searchParams.set('from', direction)

    // Signal direction so CSS can animate the named player-card element
    document.documentElement.setAttribute('data-nav-dir', direction)

    // Use Astro's navigate() — the only reliable way to trigger View Transitions
    // programmatically (synthetic clicks are not isTrusted and are skipped by ClientRouter)
    import('astro:transitions/client')
      .then(({ navigate }) => navigate(url.toString()))
      .catch(() => { window.location.href = url.toString() })
  }

  if (carouselPrevBtn) {
    carouselPrevBtn.addEventListener('click', () => navigateCarousel('prev'))
  }
  if (carouselNextBtn) {
    carouselNextBtn.addEventListener('click', () => navigateCarousel('next'))
  }

  modal.addEventListener('keydown', (e) => {
    if (!modal.open) return
    if (e.key === 'ArrowLeft') { e.preventDefault(); navigateCarousel('prev') }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigateCarousel('next') }
  })
  // ── End carousel navigation ──────────────────────────────────────────────

  const params = new URLSearchParams(window.location.search)
  const initialDesign =
    params.get('design') ||
    window.localStorage.getItem(storageKey) ||
    card.dataset.design ||
    'holo-refractor'

  setDesign(initialDesign, { persist: false })

  if (params.get('card') === '3d') {
    setFlipped(params.get('side') === 'back')
    openModal()
  }
}

// ── Card preview mode (used by /card-preview/[slug] for Puppeteer screenshots) ─

export function setupCardPreview() {
  const card = document.querySelector('[data-player-card]')
  const stage = document.querySelector('[data-player-card-stage]')
  const sceneHost = document.querySelector('[data-player-card-scene]')

  if (!(card instanceof HTMLElement)) return

  // Apply HC mask from data-mask-url attribute on ch-card / design-card
  const chCard = card.querySelector('.ch-card')
  const designCard = card.querySelector('.design-card')
  const maskUrl = (chCard instanceof HTMLElement && chCard.dataset.maskUrl) ? chCard.dataset.maskUrl : ''
  if (maskUrl) {
    const value = `url(${maskUrl})`
    if (chCard instanceof HTMLElement) chCard.style.setProperty('--mask', value)
    if (designCard instanceof HTMLElement) designCard.style.setProperty('--mask', value)
  }

  // Set pointer CSS variables for a nice off-centre glare (no interaction needed)
  const glareX = 42, glareY = 36
  card.style.setProperty('--card-rotate-x', '4deg')
  card.style.setProperty('--card-rotate-y', '-6deg')
  card.style.setProperty('--card-glare-x', `${glareX}%`)
  card.style.setProperty('--card-glare-y', `${glareY}%`)
  card.style.setProperty('--card-pos-x', `${glareX}%`)
  card.style.setProperty('--card-pos-y', `${glareY}%`)
  card.style.setProperty('--card-pos-x-invert', `${100 - glareX}%`)
  card.style.setProperty('--card-pos-y-invert', `${100 - glareY}%`)
  card.style.setProperty('--card-hyp', '0.48')
  card.style.setProperty('--card-opacity', '1')
  card.style.setProperty('--pointer-from-left', String((glareX / 100).toFixed(3)))
  card.style.setProperty('--pointer-from-top', String((glareY / 100).toFixed(3)))
  card.style.setProperty('--background-x', `${(37 + glareX * 0.26).toFixed(2)}%`)
  card.style.setProperty('--background-y', `${(37 + glareY * 0.26).toFixed(2)}%`)
  card.style.setProperty('--pointer-x', `${glareX}%`)
  card.style.setProperty('--pointer-y', `${glareY}%`)
  card.style.setProperty('--pointer-from-center', '0.48')

  // Start Three.js scene if stage/host elements are present
  if (stage instanceof HTMLElement && sceneHost instanceof HTMLElement) {
    const sc = setupThreeScene(sceneHost, stage, card)
    sc?.start()
  }

  // Signal Puppeteer once all images have loaded (+ a render-settle delay)
  function signalReady() {
    setTimeout(() => {
      window._cardReady = true
    }, 1600)
  }

  const images = Array.from(card.querySelectorAll('img')).filter(
    (img) => img.src && !img.src.endsWith('#')
  )
  const pending = images.filter((img) => !img.complete || !img.naturalWidth)

  if (pending.length === 0) {
    signalReady()
  } else {
    let count = pending.length
    const dec = () => { if (--count <= 0) signalReady() }
    pending.forEach((img) => {
      img.addEventListener('load', dec, { once: true })
      img.addEventListener('error', dec, { once: true })
    })
    // Hard fallback so Puppeteer never hangs
    setTimeout(() => { if (!window._cardReady) window._cardReady = true }, 8000)
  }
}

