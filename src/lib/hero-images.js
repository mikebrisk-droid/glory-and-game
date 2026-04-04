import { list } from '@vercel/blob'

function getEnv(key) {
  const viteValue = import.meta.env?.[key]
  if (typeof viteValue === 'string' && viteValue.trim()) return viteValue.trim()

  const nodeValue = process.env?.[key]
  if (typeof nodeValue === 'string' && nodeValue.trim()) return nodeValue.trim()

  return ''
}

export const STATIC_HERO_IMAGES = [
  '/assets/hero/braden-collum-9HI8UJMSdZA-unsplash.jpg',
  '/assets/hero/courtney-cook-SsIIw_MET0E-unsplash.jpg',
  '/assets/hero/emilio-garcia-AWdCgDDedH0-unsplash.jpg',
  '/assets/hero/gentrit-sylejmani-JjUyjE-oEbM-unsplash.jpg',
  '/assets/hero/geoff-scott-8lUTnkZXZSA-unsplash.jpg',
  '/assets/hero/ilya-shishikhin-bpz-MQJDJuA-unsplash.jpg',
  '/assets/hero/jannes-glas-0NaQQsLWLkA-unsplash.jpg',
  '/assets/hero/john-arano-h4i9G-de7Po-unsplash.jpg',
  '/assets/hero/lan-gao-MpjJKR-P18I-unsplash.jpg',
  '/assets/hero/nathanael-desmeules-mWPdKMZPEpU-unsplash.jpg',
  '/assets/hero/sandro-schuh-HgwY_YQ1m0w-unsplash.jpg',
  '/assets/hero/sincerely-media-oC32cy4x-ZA-unsplash.jpg',
  '/assets/hero/taylor-smith-selWWrPDkoc-unsplash.jpg',
  '/assets/hero/valentin-balan-k0aVMMZwqtU-unsplash.jpg',
]

const HERO_PREFIX = 'hero/'
const CACHE_TTL_MS = 5 * 60 * 1000

let cachedBlobHeroes = []
let cachedAt = 0

function dedupeImages(images) {
  const byUrl = new Map()
  images.filter(Boolean).forEach((image) => {
    if (!byUrl.has(image.url)) {
      byUrl.set(image.url, image)
    }
  })
  return Array.from(byUrl.values())
}

export function getFallbackHeroImages() {
  return [...STATIC_HERO_IMAGES]
}

export async function getBlobHeroImages(options = {}) {
  const token = getEnv('BLOB_READ_WRITE_TOKEN')
  if (!token) return []

  const now = Date.now()
  if (!options.force && cachedAt && now - cachedAt < CACHE_TTL_MS) {
    return [...cachedBlobHeroes]
  }

  const blobs = []
  let cursor

  do {
    const result = await list({
      token,
      prefix: HERO_PREFIX,
      cursor,
      limit: 1000,
    })

    blobs.push(...(result.blobs || []))
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor)

  cachedBlobHeroes = blobs
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .map((blob) => ({
      pathname: blob.pathname,
      url: blob.url,
      uploadedAt: blob.uploadedAt.toISOString(),
      size: blob.size,
    }))
  cachedAt = now

  return [...cachedBlobHeroes]
}

export async function getAllHeroImages(options = {}) {
  const staticImages = getFallbackHeroImages().map((url) => ({
    pathname: url.replace(/^\//, ''),
    url,
    uploadedAt: '',
    size: 0,
    source: 'static',
  }))

  try {
    const blobImages = await getBlobHeroImages(options)
    return dedupeImages([
      ...blobImages.map((image) => ({
        ...image,
        source: 'blob',
      })),
      ...staticImages,
    ])
  } catch {
    return staticImages
  }
}

export async function getRandomHeroImage() {
  const images = await getAllHeroImages()
  const urls = images.map((image) => image.url).filter(Boolean)
  return urls[Math.floor(Math.random() * urls.length)] || '/assets/home/hero-home.jpg'
}
