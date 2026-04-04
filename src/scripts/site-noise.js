export function mountSiteNoise({
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
