import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import { useLearningStore } from '../../store/learningStore'
import { useRoadmapStore } from '../../store/roadmapStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useCourseStore } from '../../store/courseStore'
import { apiGet } from '../../lib/api'
import { LoadingSkeleton } from '../../components/Common/LoadingSkeleton'
import { OfflineBanner } from '../../components/Common/OfflineBanner'
import { ROUTES } from '../../constants/routes'
import { COLORS } from '../../constants/theme'
import { Feather, Ionicons } from '@expo/vector-icons'

// ─── Streak + XP Card ─────────────────────────────────────────────────────────
function StreakCard({ streak, theme }) {
  const xp      = streak?.totalXP || 0
  const current = streak?.current || 0

  return (
    <View style={[styles.streakCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.streakRow}>
        <View style={styles.streakStat}>
          <Text style={[styles.streakNumber, { color: COLORS.warning }]}>{current}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="flame-outline" size={13} color={COLORS.warning} />
              <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>day streak</Text>
            </View>
        </View>
        <View style={[styles.streakDivider, { backgroundColor: theme.border }]} />
        <View style={styles.streakStat}>
          <Text style={[styles.streakNumber, { color: theme.accent }]}>{xp.toLocaleString()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="zap" size={13} color={theme.accent} />
              <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>total XP</Text>
            </View>
        </View>
      </View>
      {current > 0 && (
        <Text style={[styles.streakMotivation, { color: theme.textMuted }]}>
          {current >= 7 ? `${current} days strong — keep it up!`
            : current >= 3 ? 'Building momentum!'
            : "You're on a roll!"}
        </Text>
      )}
    </View>
  )
}

// ─── Roadmap Progress Card ────────────────────────────────────────────────────
function RoadmapCard({ roadmap, onPress, theme }) {
  const nodes     = roadmap.nodes || []
  const total     = nodes.length
  const completed = nodes.filter((n) => n.status === 'completed').length
  const percent   = total > 0 ? Math.round((completed / total) * 100) : 0
  const nextNode  = nodes.find((n) => n.status === 'available' || n.status === 'in_progress')

  return (
    <TouchableOpacity
      style={[styles.roadmapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => onPress(roadmap.id)}
      activeOpacity={0.75}
    >
      <Text style={[styles.roadmapTitle, { color: theme.textPrimary }]} numberOfLines={2}>
        {roadmap.title}
      </Text>
      {nextNode && (
        <Text style={[styles.roadmapNext, { color: theme.textSecondary }]} numberOfLines={1}>
          Next: {nextNode.title}
        </Text>
      )}
      <View style={{ marginTop: 10 }}>
        <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textMuted }]}>
          {completed}/{total} nodes · {percent}%
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Recommended Roadmap Card ─────────────────────────────────────────────────
function RecommendedCard({ roadmap, onPress, theme }) {
  const nodeCount = roadmap.nodes?.length || 0
  return (
    <TouchableOpacity
      style={[styles.recommendedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => onPress(roadmap.id)}
      activeOpacity={0.75}
    >
      <Text style={[styles.recommendedTitle, { color: theme.textPrimary }]} numberOfLines={2}>
        {roadmap.title}
      </Text>
      <Text style={[styles.recommendedMeta, { color: theme.textSecondary }]}>
        {nodeCount} nodes
      </Text>
      <View style={[styles.enrollBtn, { borderColor: theme.accent }]}>
        <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>Explore →</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Recent Activity Item ─────────────────────────────────────────────────────
function ActivityItem({ item, theme }) {
  return (
    <View style={[styles.activityItem, { borderBottomColor: theme.border }]}>
      <View style={[styles.activityDot, { backgroundColor: COLORS.success }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.activityText, { color: theme.textPrimary }]} numberOfLines={1}>
          Completed: {item.title}
        </Text>
        <Text style={[styles.activityTime, { color: theme.textMuted }]}>{item.roadmapTitle}</Text>
      </View>
      <Text style={[styles.activityXP, { color: COLORS.warning }]}>+{item.xp} XP</Text>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { t }      = useTranslation('common')
  const theme      = useTheme()
  const router     = useRouter()
  const insets     = useSafeAreaInsets()

  const { profile }  = useAuthStore()
  const { streak }   = useLearningStore()
  const { roadmaps } = useRoadmapStore()
  const { courses }  = useCourseStore()
  const { subscriptionTier } = useSettingsStore()

  const [allRoadmaps, setAllRoadmaps]     = useState([])
  const [recentActivity, setActivity]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)

  const hour         = new Date().getHours()
  const greetingKey  = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const name         = profile?.display_name || profile?.email?.split('@')[0] || 'there'
  const greeting     = t(`greeting.${greetingKey}`, { name, defaultValue: `Good ${greetingKey}, ${name}` })

  // Active roadmaps: ones that are in the local store with progress
  const activeRoadmaps = Object.values(roadmaps).filter((r) =>
    r.nodes?.some((n) => n.status === 'completed' || n.status === 'in_progress')
  )

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await apiGet('/api/roadmap')
      setAllRoadmaps(data?.roadmaps || [])
    } catch {
      // Offline — keep whatever is in store
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  function onRefresh() {
    setRefreshing(true)
    load(true)
  }

  const recommended = allRoadmaps
    .filter((r) => !Object.keys(roadmaps).includes(r.id))
    .slice(0, 6)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
    >
      <OfflineBanner />

      <View style={styles.content}>
        {/* Greeting */}
        <Text style={[styles.greeting, { color: theme.textPrimary }]}>{greeting}</Text>

        {/* Streak + XP */}
        {loading ? (
          <LoadingSkeleton variant="card" style={{ height: 90 }} />
        ) : (
          <StreakCard streak={streak} theme={theme} />
        )}

        {/* Continue Learning */}
        {(loading || activeRoadmaps.length > 0) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Continue Learning</Text>
            {loading ? (
              <LoadingSkeleton variant="card" />
            ) : (
              activeRoadmaps.map((r) => (
                <RoadmapCard
                  key={r.id}
                  roadmap={r}
                  onPress={(id) => router.push(ROUTES.ROADMAP(id))}
                  theme={theme}
                />
              ))
            )}
          </View>
        )}

        {/* Recommended Roadmaps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Explore Roadmaps</Text>
            <TouchableOpacity onPress={() => router.push(ROUTES.EXPLORE)}>
              <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>See all →</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[0, 1, 2].map((i) => (
                <LoadingSkeleton key={i} variant="card" style={{ width: 180, height: 130, marginRight: 12 }} />
              ))}
            </ScrollView>
          ) : recommended.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {recommended.map((r) => (
                <RecommendedCard
                  key={r.id}
                  roadmap={r}
                  onPress={(id) => router.push(ROUTES.ROADMAP(id))}
                  theme={theme}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyState, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
                You've explored all available roadmaps
              </Text>
            </View>
          )}
        </View>

        {/* Quick Learn CTA */}
        {!loading && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Learn Anything</Text>
            </View>
            <TouchableOpacity
              style={[styles.learnAnythingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push(ROUTES.COURSE_NEW)}
              activeOpacity={0.8}
            >
              <Feather name="zap" size={32} color={theme.accent} style={{ marginBottom: 10 }} />
              <Text style={[styles.learnAnythingTitle, { color: theme.textPrimary }]}>
                AI Personalized Course
              </Text>
              <Text style={[styles.learnAnythingDesc, { color: theme.textSecondary }]}>
                Type any topic — public speaking, Python, personal finance — and get a personalized 5-min course in seconds.
              </Text>
              <View style={[styles.learnAnythingBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 14 }}>Start learning →</Text>
              </View>
            </TouchableOpacity>
            {Object.values(courses).length > 0 && (
              <TouchableOpacity
                style={{ marginTop: 10, alignItems: 'center', padding: 8 }}
                onPress={() => router.push(ROUTES.MY_LEARNING)}
              >
                <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>
                  View all my courses ({Object.values(courses).length}) →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Start if no active roadmaps */}
        {!loading && activeRoadmaps.length === 0 && (
          <TouchableOpacity
            style={[styles.getStartedBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push(ROUTES.EXPLORE)}
          >
            <Text style={{ color: theme.accentText, fontWeight: 'bold', fontSize: 16 }}>
              Browse Roadmaps →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content:          { padding: 20, paddingBottom: 40 },
  greeting:         { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  section:          { marginTop: 28 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:     { fontSize: 18, fontWeight: '700', marginBottom: 14 },

  streakCard:       { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 4 },
  streakRow:        { flexDirection: 'row', alignItems: 'center' },
  streakStat:       { flex: 1, alignItems: 'center' },
  streakNumber:     { fontSize: 36, fontWeight: 'bold', lineHeight: 42 },
  streakLabel:      { fontSize: 13, marginTop: 2 },
  streakDivider:    { width: 1, height: 48, marginHorizontal: 16 },
  streakMotivation: { textAlign: 'center', fontSize: 13, marginTop: 12 },

  roadmapCard:      { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  roadmapTitle:     { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  roadmapNext:      { fontSize: 13, marginBottom: 2 },
  progressTrack:    { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: 5, borderRadius: 3 },
  progressText:     { fontSize: 12, marginTop: 5 },

  recommendedCard:  { width: 180, borderRadius: 14, borderWidth: 1, padding: 14, justifyContent: 'space-between' },
  recommendedTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 6 },
  recommendedMeta:  { fontSize: 12, marginBottom: 10 },
  enrollBtn:        { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },

  activityItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  activityDot:      { width: 8, height: 8, borderRadius: 4 },
  activityText:     { fontSize: 14, fontWeight: '600' },
  activityTime:     { fontSize: 12, marginTop: 2 },
  activityXP:       { fontSize: 13, fontWeight: 'bold' },

  emptyState:          { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center' },
  getStartedBtn:       { marginTop: 24, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  learnAnythingCard:   { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center' },
  learnAnythingTitle:  { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  learnAnythingDesc:   { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  learnAnythingBtn:    { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
})
