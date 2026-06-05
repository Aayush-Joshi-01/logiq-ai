import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'

// Phase 3: MCQ, fill-blank, Feynman (Q5 always), pass/fail results

export default function QuizScreen() {
  const { nodeId } = useLocalSearchParams()
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>Quiz {nodeId} — Phase 3</Text>
    </View>
  )
}
