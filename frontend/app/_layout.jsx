import { useEffect } from 'react'
import { AppState } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as Linking from 'expo-linking'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { supabase } from '../lib/supabase'
import { refreshSubscriptionStatus } from '../lib/subscription'
import { initI18n } from '../lib/i18n'
import { useOfflineSync } from '../hooks/useOfflineSync'
import '../global.css'

// initI18n is called synchronously here, before any render, to avoid flash of English text
const settings = useSettingsStore.getState()
initI18n(settings.language)

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const { user, session, setSession, clearAuth } = useAuthStore()
  const { subscriptionTier, setSubscriptionTier } = useSettingsStore()

  useOfflineSync()

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Restore existing session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Redirect based on auth state
  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/onboarding')
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [user, segments])

  // Poll subscription status when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && user?.id) {
        const tier = await refreshSubscriptionStatus(user.id)
        setSubscriptionTier(tier)
      }
    })
    return () => subscription.remove()
  }, [user])

  // Handle Supabase OAuth deep link: learnlyai://auth/callback?token=...
  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (url.includes('auth/callback')) {
        const params = Linking.parse(url)
        const accessToken  = params.queryParams?.access_token
        const refreshToken = params.queryParams?.refresh_token
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        }
      }
    })
    return () => subscription.remove()
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="roadmap/[id]" />
      <Stack.Screen name="lesson/[nodeId]" />
      <Stack.Screen name="quiz/[nodeId]" />
      <Stack.Screen name="subscription/index" />
      <Stack.Screen name="+not-found" />
    </Stack>
  )
}
