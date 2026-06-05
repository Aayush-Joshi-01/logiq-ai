import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

// Phase 3: full explore implementation
// Search bar, filter chips, 2-col roadmap grid, featured card
// V2: AI Generate Your Roadmap banner (FEATURES.ROADMAP_GENERATION), community trending

export default function ExploreScreen() {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>Explore — Phase 3</Text>
    </View>
  )
}
