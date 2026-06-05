import { getSubscriptionTier } from '../lib/subscription'
import { forbidden } from '../lib/auth'

export async function requirePro(userId: string) {
  const tier = await getSubscriptionTier(userId)
  if (tier !== 'pro') {
    return { tier, response: forbidden() }
  }
  return { tier, response: null }
}

export { getSubscriptionTier }
