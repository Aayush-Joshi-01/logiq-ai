import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import { useRoadmapStore } from '../../store/roadmapStore'
import { useLearningStore } from '../../store/learningStore'
import { useCourseStore } from '../../store/courseStore'
import { apiGet } from '../../lib/api'
import { LoadingSkeleton } from '../../components/Common/LoadingSkeleton'
import { OfflineBanner } from '../../components/Common/OfflineBanner'
import { ROUTES } from '../../constants/routes'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '../../constants/theme'

// ─── Shared Progress Bar ──────────────────────────────────────────────────────
function ProgressBar({ percent, theme }) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
      <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: percent === 100 ? COLORS.success : theme.accent }]} />
    </View>
  )
}

// ─── Roadmap Row Card ─────────────────────────────────────────────────────────
function RoadmapRow({ roadmap, onPress, theme }) {
  const nodes     = roadmap.nodes || []
  const total     = nodes.length
  const completed = nodes.filter((n) => n.status === 'completed').length
  const percent   = total > 0 ? Math.round((completed / total) * 100) : 0
  const isDone    = percent === 100
  const nextNode  = nodes.find((n) => n.status === 'in_progress') || nodes.find((n) => n.status === 'available')

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => onPress(roadmap.id)}
      activeOpacity={0.75}
    >
      <View style={[styles.rowStripe, { backgroundColor: isDone ? COLORS.success : theme.accent }]} />
      <View style={{ flex: 1, padding: 14 }}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, { color: theme.textPrimary }]} numberOfLines={1}>{roadmap.title}</Text>
          {isDone && <Text style={styles.doneChip}>✓ Done</Text>}
        </View>
        {nextNode && !isDone && (
          <Text style={[styles.rowNext, { color: theme.textSecondary }]} numberOfLines={1}>
            Up next: {nextNode.title}
          </Text>
        )}
        <ProgressBar percent={percent} theme={theme} />
        <View style={styles.rowBottom}>
          <Text style={[styles.rowMeta, { color: theme.textMuted }]}>{completed}/{total} nodes · {percent}%</Text>
          <Text style={[styles.rowCta, { color: theme.accent }]}>{isDone ? 'Review →' : 'Continue →'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Course Row Card ──────────────────────────────────────────────────────────
function CourseRow({ course, onPress, theme }) {
  const sections = course.course_sections || []
  const total    = sections.length
  const done     = sections.filter((s) => s.content_generated).length
  const percent  = total > 0 ? Math.round((done / total) * 100) : 0
  const isDone   = percent === 100
  const next     = [...sections].sort((a, b) => a.position - b.position).find((s) => !s.content_generated)

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => onPress(course.id)}
      activeOpacity={0.75}
    >
      <View style={[styles.rowStripe, { backgroundColor: isDone ? COLORS.success : COLORS.warning }]} />
      <View style={{ flex: 1, padding: 14 }}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, { color: theme.textPrimary }]} numberOfLines={1}>{course.title}</Text>
          {isDone && <Text style={styles.doneChip}>✓ Done</Text>}
        </View>
        {next && !isDone && (
          <Text style={[styles.rowNext, { color: theme.textSecondary }]} numberOfLines={1}>
            Up next: {next.title}
          </Text>
        )}
        <ProgressBar percent={percent} theme={theme} />
        <View style={styles.rowBottom}>
          <Text style={[styles.rowMeta, { color: theme.textMuted }]}>{done}/{total} sections · {percent}%</Text>
          <Text style={[styles.rowCta, { color: COLORS.warning }]}>{isDone ? 'Review →' : 'Continue →'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
function TabBar({ active, onChange, theme }) {
  return (
    <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      {['Roadmaps', 'My Courses'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, active === tab && { borderBottomColor: theme.accent }]}
          onPress={() => onChange(tab)}
        >
          <Text style={[styles.tabText, { color: active === tab ? theme.accent : theme.textMuted }]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyLearningScreen() {
  const theme  = useTheme()
  const router = useRouter()

  const { roadmaps, setRoadmap } = useRoadmapStore()
  const { streak }               = useLearningStore()
  const { courses, setCourse }   = useCourseStore()

  const [activeTab, setTab]           = useState('Roadmaps')
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)

  const allRoadmaps = Object.values(roadmaps)
  const allCourses  = Object.values(courses)

  const activeRoadmaps    = allRoadmaps.filter((r) => {
    const nodes = r.nodes || []
    return nodes.length > 0 && !nodes.every((n) => n.status === 'completed')
  })
  const completedRoadmaps = allRoadmaps.filter((r) => {
    const nodes = r.nodes || []
    return nodes.length > 0 && nodes.every((n) => n.status === 'completed')
  })

  const activeCourses    = allCourses.filter((c) => {
    const secs = c.course_sections || []
    return secs.length === 0 || !secs.every((s) => s.content_generated)
  })
  const completedCourses = allCourses.filter((c) => {
    const secs = c.course_sections || []
    return secs.length > 0 && secs.every((s) => s.content_generated)
  })

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      await Promise.all([
        // Refresh roadmaps
        ...Object.keys(roadmaps).map(async (id) => {
          try {
            const data = await apiGet(`/api/roadmap/${id}`)
            setRoadmap(id, data)
          } catch { /* offline */ }
        }),
        // Fetch courses
        (async () => {
          try {
            const { courses: data } = await apiGet('/api/courses')
            ;(data || []).forEach((c) => setCourse(c.id, c))
          } catch { /* offline */ }
        })(),
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [roadmaps])

  useEffect(() => { load() }, [])

  function onRefresh() { setRefreshing(true); load(true) }

  if (loading && allRoadmaps.length === 0 && allCourses.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <OfflineBanner />
        <ScrollView contentContainerStyle={styles.content}>
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" style={{ marginTop: 12 }} />
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OfflineBanner />

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: 16, marginTop: 12, borderRadius: 14 }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: COLORS.warning }]}>{streak.current || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>streak</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.accent }]}>{allRoadmaps.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>roadmaps</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: COLORS.warning }]}>{allCourses.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>courses</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{completedRoadmaps.length + completedCourses.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>completed</Text>
        </View>
      </View>

      <TabBar active={activeTab} onChange={setTab} theme={theme} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {activeTab === 'Roadmaps' ? (
          <>
            {activeRoadmaps.length === 0 && completedRoadmaps.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="map" size={40} color={theme.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No roadmaps yet</Text>
                <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: theme.accent }]} onPress={() => router.push(ROUTES.EXPLORE)}>
                  <Text style={{ color: theme.accentText, fontWeight: 'bold' }}>Browse Roadmaps</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {activeRoadmaps.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>In Progress</Text>
                    {activeRoadmaps.map((r) => (
                      <RoadmapRow key={r.id} roadmap={r} onPress={(id) => router.push(ROUTES.ROADMAP(id))} theme={theme} />
                    ))}
                  </>
                )}
                {completedRoadmaps.length > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 4 }}>
                      <Feather name="award" size={14} color={theme.textPrimary} />
                      <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 0 }]}>Completed</Text>
                    </View>
                    {completedRoadmaps.map((r) => (
                      <RoadmapRow key={r.id} roadmap={r} onPress={(id) => router.push(ROUTES.ROADMAP(id))} theme={theme} />
                    ))}
                  </>
                )}
                <TouchableOpacity style={[styles.addBtn, { borderColor: theme.accent }]} onPress={() => router.push(ROUTES.EXPLORE)}>
                  <Text style={{ color: theme.accent, fontWeight: '600' }}>+ Add another roadmap</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.newCourseBtn, { backgroundColor: theme.accent }]}
              onPress={() => router.push(ROUTES.COURSE_NEW)}
            >
              <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 15 }}>+ Learn something new</Text>
            </TouchableOpacity>

            {allCourses.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="book-open" size={40} color={theme.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No courses yet</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                  Type any topic and get a personalized 5-minute course with AI
                </Text>
              </View>
            ) : (
              <>
                {activeCourses.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>In Progress</Text>
                    {activeCourses.map((c) => (
                      <CourseRow key={c.id} course={c} onPress={(id) => router.push(ROUTES.COURSE(id))} theme={theme} />
                    ))}
                  </>
                )}
                {completedCourses.length > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 4 }}>
                      <Feather name="award" size={14} color={theme.textPrimary} />
                      <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 0 }]}>Completed</Text>
                    </View>
                    {completedCourses.map((c) => (
                      <CourseRow key={c.id} course={c} onPress={(id) => router.push(ROUTES.COURSE(id))} theme={theme} />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  content:      { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 4 },

  statsRow:     { flexDirection: 'row', borderWidth: 1, padding: 14, marginBottom: 4 },
  stat:         { flex: 1, alignItems: 'center' },
  statNum:      { fontSize: 24, fontWeight: 'bold' },
  statLabel:    { fontSize: 11, marginTop: 2 },
  statDivider:  { width: 1, marginHorizontal: 6, alignSelf: 'stretch' },

  tabBar:       { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 12 },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:      { fontSize: 14, fontWeight: '700' },

  row:          { flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  rowStripe:    { width: 4 },
  rowTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowTitle:     { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  doneChip:     { fontSize: 12, color: COLORS.success, fontWeight: '700' },
  rowNext:      { fontSize: 12, marginBottom: 8 },
  rowBottom:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  rowMeta:      { fontSize: 12 },
  rowCta:       { fontSize: 12, fontWeight: '700' },

  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 5, borderRadius: 3 },

  emptyState:   { alignItems: 'center', paddingVertical: 48 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptyDesc:    { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 260 },
  ctaBtn:       { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },

  newCourseBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  addBtn:       { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, borderStyle: 'dashed' },
})
