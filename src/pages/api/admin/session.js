import {
  createAdminSessionValue,
  getAdminSecret,
  getAdminSessionCookieName,
  isAdminAuthenticated,
  isAdminConfigured,
} from '../../../lib/admin'
import { privateNoStoreHeader } from '../../../lib/http-cache'

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': privateNoStoreHeader(),
      ...(init.headers || {}),
    },
  })
}

function cookieBaseAttributes(request) {
  const url = new URL(request.url)
  const secure = url.protocol === 'https:'
  return [`Path=/`, 'HttpOnly', 'SameSite=Lax', ...(secure ? ['Secure'] : [])]
}

export async function POST({ request }) {
  if (!isAdminConfigured()) {
    return json({ error: 'Admin access is not configured yet. Add ADMIN_SECRET to enable moderation.' }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const providedSecret = String(body?.secret || '').trim()
  if (!providedSecret || providedSecret !== getAdminSecret()) {
    return json({ error: 'Incorrect admin password.' }, { status: 401 })
  }

  const cookie = [
    `${getAdminSessionCookieName()}=${encodeURIComponent(createAdminSessionValue())}`,
    'Max-Age=604800',
    ...cookieBaseAttributes(request),
  ].join('; ')

  return json(
    { ok: true, authenticated: true },
    {
      headers: {
        'set-cookie': cookie,
      },
    }
  )
}

export async function DELETE({ request }) {
  const cookie = [
    `${getAdminSessionCookieName()}=`,
    'Max-Age=0',
    ...cookieBaseAttributes(request),
  ].join('; ')

  return json(
    { ok: true },
    {
      headers: {
        'set-cookie': cookie,
      },
    }
  )
}

export async function GET({ request }) {
  return json({ authenticated: isAdminAuthenticated(request) })
}
