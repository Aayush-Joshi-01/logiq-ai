import { useSettingsStore } from '../store/settingsStore'

export function useRateLimit() {
  const { dailyCallsUsed, dailyCallsLimit, subscriptionTier } = useSettingsStore()
  const remaining = Math.max(0, dailyCallsLimit - dailyCallsUsed)

  return {
    remaining,
    isLimited:   remaining === 0,
    showWarning: remaining <= 3 && remaining > 0,
    isPro:       subscriptionTier === 'pro',
  }
}
