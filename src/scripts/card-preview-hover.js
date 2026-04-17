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

function applyMask(preview) {
  ;['.ch-card', '.design-card'].forEach((selector) => {
    const el = preview.querySelector(selector)
    if (el instanceof HTMLElement) {
      const url = el.dataset.maskUrl
      if (url) el.style.setProperty('--mask', `url("${url}")`)
    }
  })
}

export function bindCardPreviewHover(
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

  applyMask(preview)
  setCardVars(card, restX, restY, { damp: restDamp, opacity: restOpacity })

  const handleMove = (event) => {
    const bounds = scaler.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
    setCardVars(card, x, y, { damp: activeDamp, opacity: activeOpacity })
  }

  const handleLeave = () => {
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
    window.removeEventListener('blur', handleLeave)
    document.removeEventListener('visibilitychange', handleLeave)
  }
}
