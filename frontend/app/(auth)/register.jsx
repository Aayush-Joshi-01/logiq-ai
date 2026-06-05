import { useRouter } from 'expo-router'
import { useEffect } from 'react'

// Registration is handled in onboarding Step 5.
// This route just redirects to onboarding.
export default function RegisterScreen() {
  const router = useRouter()
  useEffect(() => { router.replace('/(auth)/onboarding') }, [])
  return null
}
