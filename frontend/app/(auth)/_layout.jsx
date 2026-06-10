import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '../../store/authStore'

export default function AuthLayout() {
  const { user, sessionLoaded } = useAuthStore()
  if (!sessionLoaded) return null
  if (user) return <Redirect href="/(tabs)" />
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  )
}
