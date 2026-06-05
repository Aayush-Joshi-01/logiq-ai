import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'

// Phase 3: full RoadmapGraph implementation
// Custom SVG graph (dagre layout), pinch/pan, node states, bottom sheet, FAB

export default function RoadmapScreen() {
  const { id } = useLocalSearchParams()
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>Roadmap {id} — Phase 3</Text>
    </View>
  )
}
