import { put } from '@vercel/blob'
import { privateNoStoreHeader } from '../../../lib/http-cache'

function getEnv(key) {
  const viteValue = import.meta.env?.[key]
  if (typeof viteValue === 'string' && viteValue.trim()) return viteValue.trim()

  const nodeValue = process.env?.[key]
  if (typeof nodeValue === 'string' && nodeValue.trim()) return nodeValue.trim()

  return ''
}

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['".,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getExtension(filename, mimeType) {
  const fromName = String(filename || '').split('.').pop()
  if (fromName && fromName !== filename) return fromName.toLowerCase()

  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'jpg'
}

export async function POST({ request }) {
  const token = getEnv('BLOB_READ_WRITE_TOKEN')
  if (!token) {
    return json(
      { error: 'Vercel Blob is not configured yet. Add BLOB_READ_WRITE_TOKEN before uploading images.' },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const athleteName = String(formData.get('athleteName') || '').trim()

  if (!(file instanceof File) || file.size === 0) {
    return json({ error: 'Please choose an image file to upload.' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return json({ error: 'Only image files can be uploaded.' }, { status: 400 })
  }

  const maxBytes = 4.5 * 1024 * 1024
  if (file.size > maxBytes) {
    return json({ error: 'Image is too large. Please upload a file under 4.5 MB.' }, { status: 400 })
  }

  const baseName = slugify(athleteName) || 'athlete'
  const extension = getExtension(file.name, file.type)
  const pathname = `athletes/${baseName}-${Date.now()}.${extension}`

  try {
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
      token,
    })

    return json({ url: blob.url })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'We could not upload that image right now.' },
      { status: 500 }
    )
  }
}
