import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

// Payments are coming soon (Razorpay post-beta).
export default function SubscriptionScreen() {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>🚀</Text>
      <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>
        Pro is coming soon
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
        During beta, all features are free. Paid plans with higher AI limits and advanced features will launch soon.
      </Text>
    </View>
  )
}
