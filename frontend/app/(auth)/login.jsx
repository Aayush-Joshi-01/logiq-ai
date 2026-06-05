import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/theme'

export default function LoginScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const theme = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success, _layout.jsx auth listener redirects to /(tabs)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: theme.textPrimary, fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
        Welcome back
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 32 }}>
        Sign in to continue learning
      </Text>

      {error && (
        <Text style={{ color: COLORS.error, fontSize: 14, marginBottom: 16 }}>{error}</Text>
      )}

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email address"
        placeholderTextColor={theme.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 14,
          color: theme.textPrimary,
          fontSize: 15,
          marginBottom: 10,
        }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 14,
          color: theme.textPrimary,
          fontSize: 15,
          marginBottom: 24,
        }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading || !email || !password}
        style={{
          padding: 16,
          borderRadius: 12,
          backgroundColor: theme.accent,
          alignItems: 'center',
          opacity: loading || !email || !password ? 0.6 : 1,
        }}
      >
        <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: 'bold' }}>
          {loading ? '...' : 'Sign in'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/onboarding')} style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={{ color: theme.textMuted, fontSize: 15 }}>
          Don't have an account? <Text style={{ color: theme.accent }}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}
