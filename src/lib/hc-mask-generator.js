import sharp from 'sharp'
import { put } from '@vercel/blob'

function getEnv(key) {
  const viteValue = import.meta.env?.[key]
  if (typeof viteValue === 'string' && viteValue.trim()) return viteValue.trim()

  const nodeValue = process.env?.[key]
  if (typeof nodeValue === 'string' && nodeValue.trim()) return nodeValue.trim()

  return ''
}

/**
 * Calls the Clipdrop API to strip the background from an image URL.
 * Clipdrop has a free tier (100 calls/day) — get a key at clipdrop.co/apis.
 * Returns a Buffer containing the PNG with player=opaque, background=transparent.
 */
async function removeBg(imageUrl) {
  const apiKey = getEnv('CLIPDROP_API_KEY')
  if (!apiKey) throw new Error('CLIPDROP_API_KEY is not configured')

  // Clipdrop requires the image as a file upload, so fetch it first
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) throw new Error(`Could not fetch athlete image: ${imageResponse.status}`)
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

  const body = new FormData()
  body.append('image_file', new Blob([imageBuffer], { type: contentType }), 'image.jpg')

  const response = await fetch('https://clipdrop-api.co/remove-background/v1', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => String(response.status))
    throw new Error(`Clipdrop responded ${response.status}: ${text}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

/**
 * Generates a HC mask for an athlete and uploads it to Vercel Blob.
 *
 * The mask PNG has:
 *   player area  → transparent (holo hidden → player stays clean)
 *   background   → opaque     (holo/shine/sparkle shows in background)
 *
 * Returns the public blob URL.
 */
export async function generateAndUploadHcMask(slug, imageUrl) {
  const token = getEnv('BLOB_READ_WRITE_TOKEN')
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not configured')

  // Step 1: Remove background (player=opaque, bg=transparent)
  const removedBuffer = await removeBg(imageUrl)

  // Step 2: Invert alpha — player→transparent, bg→opaque
  const { data, info } = await sharp(removedBuffer)
    .resize(800, 1120, { fit: 'cover', position: 'top' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < info.width * info.height; i++) {
    const p = i * 4
    rgba[p] = rgba[p + 1] = rgba[p + 2] = 255
    rgba[p + 3] = 255 - data[p + 3]
  }

  const maskBuffer = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(1.5)
    .png({ compressionLevel: 8 })
    .toBuffer()

  // Step 3: Upload to blob (stable pathname, no random suffix)
  const blob = await put(`athletes/hc/${slug}.png`, maskBuffer, {
    access: 'public',
    addRandomSuffix: false,
    token,
    contentType: 'image/png',
  })

  return blob.url
}
