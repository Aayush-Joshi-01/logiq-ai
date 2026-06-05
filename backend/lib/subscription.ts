import { supabase } from './supabase'
import { redis } from './redis'

const TIER_CACHE_TTL = 300 // 5 minutes

export async function getSubscriptionTier(userId: string): Promise<'free' | 'pro'> {
  // Check Redis cache first to avoid DB hit on every request
  const cached = await redis.get<string>(`tier:${userId}`)
  if (cached) return cached as 'free' | 'pro'

  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  const tier = (data?.subscription_tier || 'free') as 'free' | 'pro'
  await redis.set(`tier:${userId}`, tier, { ex: TIER_CACHE_TTL })
  return tier
}

export async function bustTierCache(userId: string): Promise<void> {
  await redis.del(`tier:${userId}`)
}
