import { createClerkClient } from '@clerk/backend'

function getClerk() {
  return createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  })
}

export async function getUserFavorites(userId) {
  const clerk = getClerk()
  const user = await clerk.users.getUser(userId)
  return Array.isArray(user.privateMetadata?.favorites) ? user.privateMetadata.favorites : []
}

export async function toggleUserFavorite(userId, slug) {
  const clerk = getClerk()
  const favorites = await getUserFavorites(userId)
  const already = favorites.includes(slug)
  const updated = already ? favorites.filter((s) => s !== slug) : [...favorites, slug]
  await clerk.users.updateUser(userId, {
    privateMetadata: { favorites: updated },
  })
  return { favorites: updated, added: !already }
}
