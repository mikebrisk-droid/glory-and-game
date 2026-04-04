export function publicCacheHeader({ sMaxAge = 300, staleWhileRevalidate = 3600 } = {}) {
  return `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
}

export function privateNoStoreHeader() {
  return 'private, no-store, max-age=0'
}

