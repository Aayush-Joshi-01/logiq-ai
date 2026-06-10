import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, LayoutAnimation, UIManager, Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { useCourseStore } from '../../store/courseStore'
import { apiGet, apiDelete } from '../../lib/api'
import { ROUTES } from '../../constants/routes'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '../../constants/theme'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ─── Section accordion row ────────────────────────────────────────────────────
function SectionRow({ section, index, onPress, theme }) {
  const isDone    = section.content_generated
  const hasQuiz   = section.quiz_generated

  return (
    <TouchableOpacity
      style={[styles.sectionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => onPress(section)}
      activeOpacity={0.8}
    >
      <View style={[styles.positionBadge, { backgroundColor: isDone ? COLORS.success : theme.accent }]}>
        <Text style={styles.positionText}>{isDone ? '✓' : index + 1}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]} numberOfLines={2}>
          {section.title}
        </Text>
        {section.summary && (
          <Text style={[styles.sectionSummary, { color: theme.textSecondary }]} numberOfLines={2}>
            {section.summary}
          </Text>
        )}
        <View style={styles.sectionBadges}>
          {isDone && (
            <View style={[styles.badge, { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }]}>
              <Text style={[styles.badgeText, { color: COLORS.success }]}>Read</Text>
            </View>
          )}
          {hasQuiz && (
            <View style={[styles.badge, { backgroundColor: COLORS.warning + '20', borderColor: COLORS.warning }]}>
              <Text style={[styles.badgeText, { color: COLORS.warning }]}>Quiz done</Text>
            </View>
          )}
          {!isDone && (
            <Text style={[styles.tapHint, { color: theme.accent }]}>Tap to generate →</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CourseScreen() {
  const theme  = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams()

  const { courses, setCourse, removeCourse } = useCourseStore()
  const course = courses[id]

  const [loading, setLoading] = useState(!course)

  const load = useCallback(async () => {
    try {
      const { course: data } = await apiGet(`/api/courses/${id}`)
      setCourse(data.id, data)
    } catch {
      // keep cached version if offline
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [])

  const sections = [...(course?.course_sections ?? [])].sort((a, b) => a.position - b.position)
  const total    = sections.length
  const done     = sections.filter((s) => s.content_generated).length
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0

  function openSection(section) {
    router.push(ROUTES.SECTION(id, section.id))
  }

  async function handleDelete() {
    Alert.alert('Archive course?', 'This course will be removed from your list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/courses/${id}`)
            removeCourse(id)
            router.back()
          } catch {
            Alert.alert('Error', 'Failed to archive course.')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  }

  if (!course) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Course not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.accent }}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.courseTitle, { color: theme.textPrimary }]}>{course.title}</Text>
        {course.description && (
          <Text style={[styles.courseDesc, { color: theme.textSecondary }]}>{course.description}</Text>
        )}

        {/* Progress */}
        <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
              {done}/{total} sections read · {pct}%
            </Text>
            {pct === 100 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="award" size={14} color={COLORS.success} />
                  <Text style={[styles.completedBadge, { color: COLORS.success }]}>Complete</Text>
                </View>
              )}
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct === 100 ? COLORS.success : theme.accent }]} />
          </View>
        </View>

        {/* Sections */}
        <Text style={[styles.sectionsLabel, { color: theme.textPrimary }]}>Course Outline</Text>
        {sections.map((section, i) => (
          <SectionRow
            key={section.id}
            section={section}
            index={i}
            onPress={openSection}
            theme={theme}
          />
        ))}

        {/* Archive */}
        <TouchableOpacity style={[styles.archiveBtn, { borderColor: theme.border }]} onPress={handleDelete}>
          <Text style={{ color: theme.textMuted, fontSize: 14 }}>Archive this course</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { padding: 20, paddingBottom: 60 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  courseTitle:    { fontSize: 24, fontWeight: 'bold', lineHeight: 32, marginBottom: 8 },
  courseDesc:     { fontSize: 14, lineHeight: 20, marginBottom: 20 },

  progressCard:   { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 24 },
  progressRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel:  { fontSize: 13 },
  completedBadge: { fontSize: 13, fontWeight: '700' },
  progressTrack:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: 6, borderRadius: 3 },

  sectionsLabel:  { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  sectionRow:     { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  positionBadge:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  positionText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 4 },
  sectionSummary: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  sectionBadges:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  badge:          { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:      { fontSize: 11, fontWeight: '600' },
  tapHint:        { fontSize: 12, fontWeight: '600' },

  archiveBtn:     { marginTop: 32, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderStyle: 'dashed' },
})
