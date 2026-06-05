import { View, Text, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import { useLearningStore } from '../../store/learningStore'
import { LoadingSkeleton } from '../../components/Common/LoadingSkeleton'
import { OfflineBanner } from '../../components/Common/OfflineBanner'
import { FEATURES } from '../../constants/features'

// Phase 3: full dashboard implementation
// V1 sections: header, streak+XP card, continue learning, recommended roadmaps, recent activity
// V2 additions: SRS review prompt (FEATURES.SRS), skill radar preview (FEATURES.ANALYTICS)

export default function HomeScreen() {
  const { t } = useTranslation('common')
  const theme = useTheme()
  const { profile } = useAuthStore()
  const { streak } = useLearningStore()

  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const greeting = t(`greeting.${greetingKey}`, { name: profile?.display_name || 'there' })

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: theme.textPrimary, fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>
          {greeting}
        </Text>
        {/* TODO Phase 3: Streak+XP card, Continue Learning, Recommended, Recent Activity */}
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" style={{ marginTop: 12 }} />
      </ScrollView>
    </View>
  )
}
