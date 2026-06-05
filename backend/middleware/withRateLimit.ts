import { checkRateLimit } from '../lib/ratelimit'

export async function requireRateLimit(userId: string, tier: 'free' | 'pro') {
  const { allowed, remaining, reset } = await checkRateLimit(userId, tier)
  if (!allowed) {
    return {
      allowed: false,
      remaining: 0,
      response: new Response(JSON.stringify({
        error:      'Daily AI limit reached',
        remaining:  0,
        upgradeUrl: '/subscription',
        reset,
      }), {
        status:  429,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }
  return { allowed: true, remaining, response: null }
}
