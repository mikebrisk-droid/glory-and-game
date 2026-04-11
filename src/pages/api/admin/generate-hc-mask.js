import { requireAdmin } from '../../../lib/admin'
import { generateAndUploadHcMask } from '../../../lib/hc-mask-generator'
import { invalidateHcMaskCache } from '../../../lib/athlete-masks'
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

export async function POST({ request }) {
  try {
    requireAdmin(request)
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const slug = String(body?.slug || '').trim()
  const imageUrl = String(body?.imageUrl || '').trim()

  if (!slug || !imageUrl) {
    return json({ error: 'slug and imageUrl are required.' }, { status: 400 })
  }

  try {
    const url = await generateAndUploadHcMask(slug, imageUrl)
    invalidateHcMaskCache()
    return json({ url })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Mask generation failed.' },
      { status: 500 }
    )
  }
}
