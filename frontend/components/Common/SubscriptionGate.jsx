import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSettingsStore } from '../../store/settingsStore'
import { useTheme } from '../../hooks/useTheme'
import { ROUTES } from '../../constants/routes'

export function SubscriptionGate({ children, feature }) {
  const { subscriptionTier } = useSettingsStore()
  const theme = useTheme()
  const router = useRouter()

  if (subscriptionTier === 'pro') return children

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontSize: 32, marginBottom: 16 }}>🔒</Text>
      <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
        {feature} is a Pro feature
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 15, textAlign: 'center', marginBottom: 32 }}>
        Upgrade to unlock unlimited AI, custom roadmaps, voice input, and more.
      </Text>
      <TouchableOpacity
        onPress={() => router.push(ROUTES.SUBSCRIPTION)}
        style={{
          backgroundColor: theme.accent,
          paddingHorizontal: 32,
          paddingVertical: 14,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: 'bold' }}>
          Upgrade to Pro
        </Text>
      </TouchableOpacity>
    </View>
  )
}
