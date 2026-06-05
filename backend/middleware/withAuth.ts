import { validateAuth, unauthorized } from '../lib/auth'

export async function requireAuth(req: Request) {
  const { user, error } = await validateAuth(req)
  if (!user) return { user: null, response: unauthorized() }
  return { user, response: null }
}
