import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

// Phase 4: full subscription screen with feature comparison, pricing toggle, Stripe CTA

export default function SubscriptionScreen() {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>Subscription — Phase 4</Text>
    </View>
  )
}
