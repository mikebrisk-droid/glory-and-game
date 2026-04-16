const CLERK_CSP_ORIGINS = [
  'https://clerk.gloryandgame.com',
  'https://accounts.gloryandgame.com',
]

function addOriginToDirective(directives, directiveName, origins) {
  const index = directives.findIndex((p) => p.startsWith(`${directiveName} `))
  if (index === -1) {
    directives.push(`${directiveName} 'self' ${origins.join(' ')}`)
  } else {
    const existing = directives[index].split(/\s+/)
    directives[index] = Array.from(new Set([...existing, ...origins])).join(' ')
  }
}

export async function onRequest(context, next) {
  const response = await next()

  if (!context.url.pathname.startsWith('/_emdash')) {
    return response
  }

  const csp = response.headers.get('content-security-policy')
  if (!csp) return response

  const directives = csp.split(';').map((p) => p.trim()).filter(Boolean)
  addOriginToDirective(directives, 'script-src', CLERK_CSP_ORIGINS)
  addOriginToDirective(directives, 'connect-src', CLERK_CSP_ORIGINS)
  addOriginToDirective(directives, 'img-src', CLERK_CSP_ORIGINS)
  addOriginToDirective(directives, 'style-src', CLERK_CSP_ORIGINS)
  addOriginToDirective(directives, 'frame-src', CLERK_CSP_ORIGINS)
  const patchedCsp = directives.join('; ')

  const newHeaders = new Headers(response.headers)
  newHeaders.set('content-security-policy', patchedCsp)
  newHeaders.set('x-gg-csp-patch', 'active')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
