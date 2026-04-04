import '@libsql/kysely-libsql'

function withStorageOrigins(cspValue, origins) {
  if (!cspValue || origins.length === 0) return cspValue

  const directives = cspValue.split(';').map((part) => part.trim()).filter(Boolean)
  const connectIndex = directives.findIndex((part) => part.startsWith('connect-src '))

  if (connectIndex === -1) {
    directives.push(`connect-src 'self' ${origins.join(' ')}`)
    return directives.join('; ')
  }

  const existing = directives[connectIndex].split(/\s+/)
  const merged = Array.from(new Set([...existing, ...origins]))
  directives[connectIndex] = merged.join(' ')
  return directives.join('; ')
}

export async function onRequest(context, next) {
  const response = await next()

  if (!context.url.pathname.startsWith('/_emdash')) {
    return response
  }

  const origins = ['https://s3.gloryandgame.com', process.env.EMDASH_STORAGE_ENDPOINT, process.env.EMDASH_STORAGE_PUBLIC_URL]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const csp = response.headers.get('content-security-policy')
  if (csp) {
    response.headers.set('content-security-policy', withStorageOrigins(csp, origins))
  }
  response.headers.set('x-gg-emdash-middleware', 'active')

  return response
}
