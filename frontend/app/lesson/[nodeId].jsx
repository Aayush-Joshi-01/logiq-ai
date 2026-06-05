import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'

// Phase 3: MicroLesson blocks, AI Tutor bottom sheet, FeynmanPrompt, offline cache

export default function LessonScreen() {
  const { nodeId } = useLocalSearchParams()
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>Lesson {nodeId} — Phase 3</Text>
    </View>
  )
}
