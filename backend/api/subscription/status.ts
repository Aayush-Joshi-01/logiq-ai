import { validateAuth, unauthorized } from '../../lib/auth'
import { getSubscriptionTier } from '../../lib/subscription'
import { checkRateLimit } from '../../lib/ratelimit'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const tier = await getSubscriptionTier(user.id)
  const { remaining } = await checkRateLimit(user.id, tier)

  return Response.json({ tier, remainingCalls: remaining })
}
