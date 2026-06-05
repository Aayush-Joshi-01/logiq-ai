import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

// Phase 4: full profile implementation
// Avatar, subscription card, BYOK panel, appearance, language, stats, account

export default function ProfileScreen() {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>Profile — Phase 4</Text>
    </View>
  )
}
