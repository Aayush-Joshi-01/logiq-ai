import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

// Instantiated inside handler calls, not at module level (Edge cold-start safety)
export function getFreeLimiter() {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '24 h'),
    prefix:  'rl:free',
  })
}

export function getProLimiter() {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(500, '24 h'),
    prefix:  'rl:pro',
  })
}

export async function checkRateLimit(userId: string, tier: 'free' | 'pro') {
  const limiter = tier === 'pro' ? getProLimiter() : getFreeLimiter()
  const { success, remaining, reset } = await limiter.limit(userId)
  return { allowed: success, remaining, reset }
}
