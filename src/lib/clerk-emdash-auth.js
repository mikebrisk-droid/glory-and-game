import { createClerkClient, verifyToken } from '@clerk/backend'

const EMDASH_ADMIN_ROLE = 50

function parseCookies(request) {
  const header = request.headers.get('cookie') || ''
  const cookies = {}
  for (const part of header.split(';')) {
    const [name, ...val] = part.trim().split('=')
    if (name) cookies[name.trim()] = val.join('=')
  }
  return cookies
}

export async function authenticate(request) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
  })

  const cookies = parseCookies(request)
  const sessionToken = cookies['__session'] || cookies['__clerk_db_jwt']

  if (!sessionToken) throw new Error('No Clerk session token in cookies')

  const payload = await verifyToken(sessionToken, {
    secretKey: process.env.CLERK_SECRET_KEY,
  })

  const user = await clerk.users.getUser(payload.sub)

  const email = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress

  if (!email) throw new Error('No primary email on Clerk user')

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email

  return { email, name, role: EMDASH_ADMIN_ROLE }
}
