import { getUserFavorites, toggleUserFavorite } from '../../lib/clerk-user'

export const GET = async ({ locals }) => {
  const { userId } = locals.auth()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const favorites = await getUserFavorites(userId)
  return new Response(JSON.stringify({ favorites }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST = async ({ locals, request }) => {
  const { userId } = locals.auth()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  let slug
  try {
    ;({ slug } = await request.json())
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!slug || typeof slug !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const result = await toggleUserFavorite(userId, slug)
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
}
