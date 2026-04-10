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

function syncAdminNav() {
  if (!(adminNavLink instanceof HTMLElement)) return
  adminNavLink.hidden = !window.sessionStorage.getItem(adminStorageKey)
}

syncAdminNav()
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
