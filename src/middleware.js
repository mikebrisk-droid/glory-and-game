import '@libsql/kysely-libsql'
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/_emdash(.*)',
])

export const onRequest = clerkMiddleware((auth, context) => {
  if (isProtectedRoute(context.request)) {
    const { userId, redirectToSignIn } = auth()
    if (!userId) {
      return redirectToSignIn()
    }
  }
})
