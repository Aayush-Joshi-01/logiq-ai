import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { FEATURES } from '../../constants/features'

// Phase 3: active roadmaps list
// V2 (FEATURES.SRS): SRS review queue at top

export default function MyLearningScreen() {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>My Learning — Phase 3</Text>
    </View>
  )
}
