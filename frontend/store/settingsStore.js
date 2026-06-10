import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const useSettingsStore = create(
  persist(
    (set) => ({
      language:        'en',
      isRTL:           false,
      theme:           'dark',                // 'dark' | 'light' | 'system'
      aiProvider:      'platform',            // 'platform' | 'openai' | 'gemini' | 'claude' | 'azure'
      byokKey:         null,                  // ALWAYS null — actual key lives in SecureStore only
      subscriptionTier: 'free',              // 'free' | 'pro'
      dailyCallsUsed:  0,
      dailyCallsLimit: 10,
      // V2
      preferredExplanationStyle: 'auto',     // 'conceptual' | 'visual' | 'example-first' | 'auto'
      difficultyPreference: 'auto',          // 'auto' | 'challenge' | 'ease'

      setLanguage:          (language) => set({ language }),
      setIsRTL:             (isRTL) => set({ isRTL }),
      setTheme:             (theme) => set({ theme }),
      setAIProvider:        (aiProvider) => set({ aiProvider }),
      setSubscriptionTier:  (subscriptionTier) => set({ subscriptionTier }),
      setCallsRemaining:    (remaining) => set((s) => ({ dailyCallsUsed: s.dailyCallsLimit - remaining })),
      incrementCallsUsed:   () => set((s) => ({ dailyCallsUsed: s.dailyCallsUsed + 1 })),
      resetDailyCallsUsed:  () => set({ dailyCallsUsed: 0 }),
      setPreferredStyle:    (preferredExplanationStyle) => set({ preferredExplanationStyle }),
      setDifficultyPref:    (difficultyPreference) => set({ difficultyPreference }),
    }),
    {
      name: 'logiq-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // byokKey is always excluded — it must never be persisted via Zustand
      partialize: (state) => {
        const { byokKey, ...rest } = state
        return rest
      },
    }
  )
)
