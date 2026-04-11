import { list } from '@vercel/blob'

function getEnv(key) {
  const viteValue = import.meta.env?.[key]
  if (typeof viteValue === 'string' && viteValue.trim()) return viteValue.trim()

  const nodeValue = process.env?.[key]
  if (typeof nodeValue === 'string' && nodeValue.trim()) return nodeValue.trim()

  return ''
}

const HC_MASK_PREFIX = 'athletes/hc/'
const CACHE_TTL_MS = 5 * 60 * 1000

let cachedMasks = null
let cachedAt = 0

/**
 * Returns a Map<slug, blobUrl> of all HC mask images in Vercel Blob.
 * Results are cached for 5 minutes to avoid hammering the blob list API
 * on every SSR render.
 */
export async function getBlobHcMasks(options = {}) {
  const token = getEnv('BLOB_READ_WRITE_TOKEN')
  if (!token) return new Map()

  const now = Date.now()
  if (!options.force && cachedMasks && now - cachedAt < CACHE_TTL_MS) {
    return cachedMasks
  }

  const blobs = []
  let cursor

  do {
    const result = await list({
      token,
      prefix: HC_MASK_PREFIX,
      cursor,
      limit: 1000,
    })

    blobs.push(...(result.blobs || []))
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor)

  const map = new Map()
  for (const blob of blobs) {
    // pathname: "athletes/hc/aaron-judge.png" → slug: "aaron-judge"
    const filename = blob.pathname.slice(HC_MASK_PREFIX.length)
    const slug = filename.replace(/\.png$/i, '')
    if (slug) map.set(slug, blob.url)
  }

  cachedMasks = map
  cachedAt = now

  return map
}

/**
 * Returns the Vercel Blob URL for a given athlete slug's HC mask,
 * or an empty string if not found (e.g. no blob token, or mask not uploaded).
 */
export async function getHcMaskUrl(slug) {
  try {
    const masks = await getBlobHcMasks()
    return masks.get(slug) || ''
  } catch {
    return ''
  }
}
