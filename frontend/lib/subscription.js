import * as Linking from 'expo-linking'
import { supabase } from './supabase'

const CHECKOUT_URL = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL

export async function openUpgradeFlow(userId, plan = 'monthly') {
  const url = `${CHECKOUT_URL}?userId=${encodeURIComponent(userId)}&plan=${plan}`
  await Linking.openURL(url)
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
