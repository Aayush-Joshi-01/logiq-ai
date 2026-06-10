import { validateAuth, unauthorized } from '../../lib/auth'
import { checkRateLimit } from '../../lib/ratelimit'

// Beta: everyone is on free tier. No Stripe/Razorpay yet.
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const { remaining } = await checkRateLimit(user.id, 'free')
  return Response.json({ tier: 'free', remainingCalls: remaining })
}
