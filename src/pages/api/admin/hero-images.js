import { del, put } from '@vercel/blob'

import { requireAdmin } from '../../../lib/admin'
import { getAllHeroImages } from '../../../lib/hero-images'
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
  if (mimeType === 'image/avif') return 'avif'
  return 'jpg'
}

function getBlobToken() {
  return getEnv('BLOB_READ_WRITE_TOKEN')
}

export async function GET({ request }) {
  try {
    requireAdmin(request)
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 })
  }

  try {
    const images = await getAllHeroImages({ force: true })
    return json({ images })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not load hero images.' }, { status: 500 })
  }
}

export async function POST({ request }) {
  try {
    requireAdmin(request)
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 })
  }

  const token = getBlobToken()
  if (!token) {
    return json(
      { error: 'Vercel Blob is not configured yet. Add BLOB_READ_WRITE_TOKEN before uploading hero images.' },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const label = String(formData.get('label') || '').trim()

  if (!(file instanceof File) || file.size === 0) {
    return json({ error: 'Please choose an image file to upload.' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return json({ error: 'Only image files can be uploaded.' }, { status: 400 })
  }

  const maxBytes = 6 * 1024 * 1024
  if (file.size > maxBytes) {
    return json({ error: 'Hero image is too large. Please upload a file under 6 MB.' }, { status: 400 })
  }

  const baseName = slugify(label) || 'hero-image'
  const extension = getExtension(file.name, file.type)
  const pathname = `hero/${baseName}-${Date.now()}.${extension}`

  try {
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
      token,
    })

    return json({
      image: {
        pathname: blob.pathname,
        url: blob.url,
        uploadedAt: new Date().toISOString(),
        size: file.size,
        source: 'blob',
      },
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'We could not upload that hero image right now.' },
      { status: 500 }
    )
  }
}

export async function DELETE({ request }) {
  try {
    requireAdmin(request)
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 })
  }

  const token = getBlobToken()
  if (!token) {
    return json(
      { error: 'Vercel Blob is not configured yet. Add BLOB_READ_WRITE_TOKEN before deleting hero images.' },
      { status: 500 }
    )
  }

  const url = new URL(request.url)
  const pathname = String(url.searchParams.get('pathname') || '').trim()

  if (!pathname) {
    return json({ error: 'A pathname is required to delete a hero image.' }, { status: 400 })
  }

  if (!pathname.startsWith('hero/')) {
    return json({ error: 'Only uploaded hero images can be deleted here.' }, { status: 400 })
  }

  try {
    await del(pathname, { token })
    return json({ ok: true })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not delete that hero image.' }, { status: 500 })
  }
}
