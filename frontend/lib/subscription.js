import { supabase } from './supabase'

// Payments disabled for beta. openUpgradeFlow is a no-op stub.
export async function openUpgradeFlow(_userId, _plan = 'monthly') {
  // Razorpay integration post-beta
}

export async function refreshSubscriptionStatus(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  if (error) return 'free'
  return data?.subscription_tier || 'free'
}
