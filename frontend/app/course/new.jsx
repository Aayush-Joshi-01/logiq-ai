import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import { useCourseStore } from '../../store/courseStore'
import { apiPost } from '../../lib/api'
import { ROUTES } from '../../constants/routes'

const SUGGESTIONS = [
  'Personal finance & budgeting',
  'Public speaking basics',
  'Machine learning fundamentals',
  'Leadership for new managers',
  'Digital marketing essentials',
  'Data analysis with spreadsheets',
  'Negotiation skills',
  'Creative writing',
]

export default function NewCourseScreen() {
  const theme  = useTheme()
  const router = useRouter()
  const { user } = useAuthStore()
  const { setCourse } = useCourseStore()

  const [topic, setTopic]       = useState('')
  const [description, setDesc]  = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleGenerate() {
    const t = topic.trim()
    if (!t) return

    setLoading(true)
    setError(null)
    try {
      const { course, sections } = await apiPost('/api/ai/outline', { topic: t, description: description.trim() || undefined })
      setCourse(course.id, { ...course, course_sections: sections })
      router.replace(ROUTES.COURSE(course.id))
    } catch (err) {
      setError(err?.message || 'Failed to generate outline. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, { color: theme.textPrimary }]}>What do you want to learn?</Text>
        <Text style={[styles.subheading, { color: theme.textSecondary }]}>
          Enter any topic — from Python to public speaking to personal finance.
          We'll build a personalized course outline for you.
        </Text>

        <TextInput
          style={[styles.topicInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="e.g. Machine learning for product managers"
          placeholderTextColor={theme.textMuted}
          value={topic}
          onChangeText={setTopic}
          returnKeyType="next"
          autoFocus
          maxLength={120}
        />

        <TextInput
          style={[styles.descInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="Optional: describe your goal or background (helps personalize content)"
          placeholderTextColor={theme.textMuted}
          value={description}
          onChangeText={setDesc}
          multiline
          maxLength={300}
          returnKeyType="done"
        />

        {error && (
          <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.generateBtn,
            { backgroundColor: topic.trim() ? theme.accent : theme.elevated },
          ]}
          onPress={handleGenerate}
          disabled={loading || !topic.trim()}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <Text style={[styles.generateBtnText, { color: topic.trim() ? theme.accentText : theme.textMuted }]}>
              Generate Outline
            </Text>
          )}
        </TouchableOpacity>

        {loading && (
          <Text style={[styles.loadingNote, { color: theme.textMuted }]}>
            Building your personalized outline…
          </Text>
        )}

        {/* Suggestion chips */}
        {!loading && (
          <>
            <Text style={[styles.suggestLabel, { color: theme.textSecondary }]}>Or try one of these:</Text>
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, { backgroundColor: theme.elevated, borderColor: theme.border }]}
                  onPress={() => setTopic(s)}
                >
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:       { padding: 24, paddingBottom: 60 },
  heading:         { fontSize: 26, fontWeight: 'bold', marginBottom: 10, lineHeight: 34 },
  subheading:      { fontSize: 15, lineHeight: 22, marginBottom: 28 },
  topicInput:      { borderWidth: 1.5, borderRadius: 14, padding: 16, fontSize: 16, marginBottom: 12 },
  descInput:       { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, minHeight: 80, marginBottom: 20, textAlignVertical: 'top' },
  errorText:       { fontSize: 14, marginBottom: 16 },
  generateBtn:     { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  generateBtnText: { fontSize: 16, fontWeight: '700' },
  loadingNote:     { textAlign: 'center', fontSize: 13, marginBottom: 24 },
  suggestLabel:    { fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 12 },
  chips:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:            { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText:        { fontSize: 13 },
})
