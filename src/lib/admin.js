import { createHash, timingSafeEqual } from 'node:crypto'

const ADMIN_SESSION_COOKIE = 'gg-admin-session'

function getEnv(key) {
  const viteValue = import.meta.env?.[key]
  if (typeof viteValue === 'string' && viteValue.trim()) return viteValue.trim()

  const nodeValue = process.env?.[key]
  if (typeof nodeValue === 'string' && nodeValue.trim()) return nodeValue.trim()

  return ''
}

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex')
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function getAdminSecret() {
  return getEnv('ADMIN_SECRET')
}

export function isAdminConfigured() {
  return Boolean(getAdminSecret())
}

export function createAdminSessionValue() {
  const configuredSecret = getAdminSecret()
  if (!configuredSecret) return ''
  return hashValue(`gg-admin:${configuredSecret}`)
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE
}

export function isAdminAuthenticated(requestOrCookies) {
  const configuredSecret = getAdminSecret()
  if (!configuredSecret) return false

  const expected = createAdminSessionValue()
  const cookieValue =
    typeof requestOrCookies?.headers?.get === 'function'
      ? getAdminCookieFromRequest(requestOrCookies)
      : requestOrCookies?.get?.(ADMIN_SESSION_COOKIE)?.value || ''

  return Boolean(cookieValue && safeEqual(cookieValue, expected))
}

function getAdminCookieFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = cookieHeader.split(';').map((part) => part.trim())
  const match = cookies.find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : ''
}

export function requireAdmin(request) {
  const configuredSecret = getAdminSecret()

  if (!configuredSecret) {
    throw new Error('Admin access is not configured yet. Add ADMIN_SECRET to enable moderation.')
  }

  const providedSecret = request.headers.get('x-admin-secret') || ''
  if (providedSecret && safeEqual(providedSecret, configuredSecret)) {
    return
  }

  if (isAdminAuthenticated(request)) {
    return
  }

  const error = new Error('Unauthorized')
  error.status = 401
  throw error
}

