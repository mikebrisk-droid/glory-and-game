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
  'crystal': {
    slab: '#b8e8ff',
    emissive: '#4cb8ff',
    rim: '#e0f4ff',
    halo: '#8de0ff',
    halo2: '#ffffff',
    particles: ['#b8e8ff', '#4cb8ff', '#ffffff', '#7dd4ff'],
  },
  'inferno': {
    slab: '#ff6835',
    emissive: '#ff3200',
    rim: '#ffcc44',
    halo: '#ff7b35',
    halo2: '#ffcc44',
    particles: ['#ff4500', '#ff7b35', '#ffcc44', '#ff2200'],
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
  const shareButton = document.querySelector('[data-share-player-card]')
  const shareFeedback = document.querySelector('[data-player-card-feedback]')
  const designButtons = Array.from(document.querySelectorAll('[data-player-card-design-option]'))

  if (
    !(openButton instanceof HTMLButtonElement) ||
    !(closeButton instanceof HTMLButtonElement) ||
    !(modal instanceof HTMLDialogElement) ||
    !(card instanceof HTMLElement) ||
    !(stage instanceof HTMLElement) ||
    !(sceneHost instanceof HTMLElement) ||
    !(flipButton instanceof HTMLButtonElement) ||
    !(printButton instanceof HTMLButtonElement) ||
    !(shareButton instanceof HTMLButtonElement) ||
    !(shareFeedback instanceof HTMLElement) ||
    !designButtons.every((button) => button instanceof HTMLButtonElement)
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
    designButtons.map((button) => button.dataset.playerCardDesignOption).filter(Boolean)
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

    designButtons.forEach((button) => {
      const isActive = button.dataset.playerCardDesignOption === resolvedDesign
      button.dataset.active = isActive ? 'true' : 'false'
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    })

    sceneController?.applyTheme(resolvedDesign)
    document.fonts.ready.then(() => window.requestAnimationFrame(fitPrizmName))

    if (resolvedDesign === 'prizm') {
      applyPrizmPalette()
    } else {
      card.style.removeProperty('--card-surface')
    }

    if (persist) {
      window.localStorage.setItem(storageKey, resolvedDesign)
    }

    if (modal.open) syncCardUrl()
  }

  // Extract dominant vibrant colors from a player photo via canvas
  function extractImageColors(imgEl) {
    const W = 60, H = 84
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    try {
      ctx.drawImage(imgEl, 0, 0, W, H)
      const { data } = ctx.getImageData(0, 0, W, H)

      function sample(skipWarm) {
        const out = []
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          if (lum < 14 || lum > 234) continue
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const sat = max > 0 ? (max - min) / max : 0
          if (sat < 0.12) continue

          if (skipWarm) {
            // Hard-cut any pixel where red clearly beats both other channels —
            // this eliminates arena orange, warm stage lights, and skin tones
            // (blues, greens, purples, teals all pass through fine)
            if (r > Math.max(g, b) + 40) continue
          }

          // Score: vibrancy + small lum bonus, minus residual warm-red penalty
          const warmPenalty = Math.max(0, r - Math.max(g, b)) / 255
          const score = sat * 0.75 + lum / 800 - warmPenalty * 0.5

          out.push({ r, g, b, sat, lum, score })
        }
        return out
      }

      // First pass: hard-cut warm/red pixels so jersey colours win
      let candidates = sample(true)
      // Fallback: if the photo is genuinely warm-dominant (e.g. gold uniform), allow everything
      if (candidates.length < 6) candidates = sample(false)
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
      return null // CORS failure — fall back to default Prizm colors
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

  designButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setDesign(button.dataset.playerCardDesignOption || 'holo-refractor')
    })
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

