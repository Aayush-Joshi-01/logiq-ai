import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '../../../../hooks/useTheme'
import { useCourseStore } from '../../../../store/courseStore'
import { apiPost } from '../../../../lib/api'
import { ROUTES } from '../../../../constants/routes'
import { COLORS } from '../../../../constants/theme'
import { Feather } from '@expo/vector-icons'

// ─── Content blocks ───────────────────────────────────────────────────────────
function OverviewBlock({ text, theme }) {
  return (
    <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.blockLabel, { color: theme.accent }]}>Overview</Text>
      <Text style={[styles.bodyText, { color: theme.textPrimary }]}>{text}</Text>
    </View>
  )
}

function KeyPointsBlock({ points, theme }) {
  return (
    <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.blockLabel, { color: theme.accent }]}>Key Points</Text>
      {points.map((p, i) => (
        <View key={i} style={styles.keyPointRow}>
          <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.keyPointTitle, { color: theme.textPrimary }]}>{p.point}</Text>
            {p.detail && (
              <Text style={[styles.keyPointDetail, { color: theme.textSecondary }]}>{p.detail}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

function ExampleBlock({ example, theme }) {
  return (
    <View style={[styles.block, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
      <Text style={[styles.blockLabel, { color: COLORS.warning }]}>Example</Text>
      <Text style={[styles.exampleScenario, { color: theme.textPrimary }]}>{example.scenario}</Text>
      <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{example.explanation}</Text>
    </View>
  )
}

function TakeawayBlock({ text, theme }) {
  return (
    <View style={[styles.takeaway, { backgroundColor: theme.accent + '15', borderColor: theme.accent }]}>
      <Feather name="sun" size={18} color={theme.accent} style={{ marginBottom: 6 }} />
      <Text style={[styles.takeawayText, { color: theme.textPrimary }]}>{text}</Text>
    </View>
  )
}

// ─── Quiz section (lazy) ─────────────────────────────────────────────────────
function QuizSection({ sectionId, onComplete, theme }) {
  const [questions, setQuestions]   = useState(null)
  const [loading, setLoading]       = useState(false)
  const [current, setCurrent]       = useState(0)
  const [selected, setSelected]     = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore]           = useState(0)
  const [feynmanText, setFeynman]   = useState('')
  const [quizDone, setQuizDone]     = useState(false)

  async function loadQuiz() {
    setLoading(true)
    try {
      const { questions: qs } = await apiPost('/api/ai/quiz/section', { sectionId })
      setQuestions(qs)
    } catch (e) {
      Alert.alert('Error', 'Could not load quiz. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (!questions && !loading) {
    return (
      <TouchableOpacity
        style={[styles.quizCta, { borderColor: theme.accent }]}
        onPress={loadQuiz}
      >
        <Text style={[styles.quizCtaText, { color: theme.accent }]}>Take a quick quiz →</Text>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.quizLoading}>
        <ActivityIndicator color={theme.accent} />
        <Text style={[styles.quizLoadingText, { color: theme.textMuted }]}>Generating quiz…</Text>
      </View>
    )
  }

  if (quizDone) {
    const pct = Math.round((score / (questions.length - 1)) * 100)
    return (
      <View style={[styles.quizResult, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather
          name={pct >= 80 ? 'award' : 'book-open'}
          size={32}
          color={pct >= 80 ? COLORS.success : COLORS.warning}
          style={{ marginBottom: 8 }}
        />
        <Text style={[styles.quizResultScore, { color: pct >= 80 ? COLORS.success : COLORS.warning }]}>
          {pct >= 80 ? 'Great job!' : 'Keep practicing'}
        </Text>
        <Text style={[styles.quizResultText, { color: theme.textSecondary }]}>
          {score}/{questions.length - 1} correct
        </Text>
        <TouchableOpacity onPress={onComplete} style={[styles.doneBtn, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentText, fontWeight: '700' }}>Mark section complete</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const q = questions[current]
  const isLastFeynman = current === questions.length - 1 && q.type === 'feynman'

  function handleSelect(option) {
    if (showResult) return
    setSelected(option)
    setShowResult(true)
    if (option === q.correct) setScore((s) => s + 1)
  }

  function handleNext() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1)
      setSelected(null)
      setShowResult(false)
    } else {
      setQuizDone(true)
      onComplete()
    }
  }

  return (
    <View style={[styles.quizBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.quizProgress, { color: theme.textMuted }]}>
        Question {current + 1}/{questions.length}
      </Text>
      <Text style={[styles.quizQuestion, { color: theme.textPrimary }]}>{q.question}</Text>

      {isLastFeynman ? (
        <>
          <Text style={[styles.feynmanHint, { color: theme.textSecondary }]}>
            Explain this concept in your own words:
          </Text>
          <View style={[styles.feynmanInput, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
            <Text style={{ color: feynmanText ? theme.textPrimary : theme.textMuted, fontSize: 14 }}>
              {feynmanText || 'Tap and type your explanation…'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: theme.accent }]}
            onPress={handleNext}
          >
            <Text style={{ color: theme.accentText, fontWeight: '700' }}>Finish Quiz</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {q.options?.map((opt) => {
            const isCorrect = showResult && opt === q.correct
            const isWrong   = showResult && opt === selected && opt !== q.correct
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.option,
                  { borderColor: isCorrect ? COLORS.success : isWrong ? '#ef4444' : theme.border },
                  isCorrect && { backgroundColor: COLORS.success + '20' },
                  isWrong   && { backgroundColor: '#ef444420' },
                ]}
                onPress={() => handleSelect(opt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, { color: theme.textPrimary }]}>{opt}</Text>
              </TouchableOpacity>
            )
          })}
          {showResult && (
            <>
              {q.explanation && (
                <Text style={[styles.explanation, { color: theme.textSecondary }]}>{q.explanation}</Text>
              )}
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: theme.accent }]}
                onPress={handleNext}
              >
                <Text style={{ color: theme.accentText, fontWeight: '700' }}>
                  {current < questions.length - 1 ? 'Next →' : 'See results'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SectionScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id: courseId, sectionId } = useLocalSearchParams()

  const { courses, updateSectionFlag } = useCourseStore()
  const course   = courses[courseId]
  const sections = course?.course_sections ?? []
  const section  = sections.find((s) => s.id === sectionId)

  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    async function fetchContent() {
      setLoading(true)
      setError(null)
      try {
        const { content: c } = await apiPost('/api/ai/content', { sectionId })
        setContent(c)
        updateSectionFlag(courseId, sectionId, { content_generated: true })
      } catch (e) {
        setError(e?.message || 'Failed to generate content.')
      } finally {
        setLoading(false)
      }
    }
    fetchContent()
  }, [sectionId])

  function onQuizComplete() {
    updateSectionFlag(courseId, sectionId, { quiz_generated: true })
  }

  // Navigate to next unread section
  function goNext() {
    const sorted = [...sections].sort((a, b) => a.position - b.position)
    const idx    = sorted.findIndex((s) => s.id === sectionId)
    const next   = sorted[idx + 1]
    if (next) {
      router.replace(ROUTES.SECTION(courseId, next.id))
    } else {
      router.back()
    }
  }

  const sectionIndex = sections.sort((a, b) => a.position - b.position).findIndex((s) => s.id === sectionId)

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={[styles.generatingText, { color: theme.textMuted }]}>
          Personalizing your content…
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: '#ef4444', marginBottom: 16, textAlign: 'center', padding: 20 }}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: theme.accent }]}
          onPress={() => { setLoading(true); setError(null) }}
        >
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Section header */}
        <Text style={[styles.sectionNum, { color: theme.textMuted }]}>
          Section {sectionIndex + 1}
        </Text>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          {section?.title}
        </Text>

        {/* Content blocks */}
        {content?.overview && <OverviewBlock text={content.overview} theme={theme} />}
        {content?.keyPoints?.length > 0 && <KeyPointsBlock points={content.keyPoints} theme={theme} />}
        {content?.example && <ExampleBlock example={content.example} theme={theme} />}
        {content?.takeaway && <TakeawayBlock text={content.takeaway} theme={theme} />}

        {/* Quiz */}
        <Text style={[styles.quizHeading, { color: theme.textPrimary }]}>Test your understanding</Text>
        <QuizSection sectionId={sectionId} onComplete={onQuizComplete} theme={theme} />

        {/* Next section CTA */}
        <TouchableOpacity
          style={[styles.nextSectionBtn, { backgroundColor: theme.accent }]}
          onPress={goNext}
        >
          <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 15 }}>
            Next section →
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:        { padding: 20, paddingBottom: 80 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  generatingText:   { marginTop: 20, fontSize: 14, textAlign: 'center' },

  sectionNum:       { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  sectionTitle:     { fontSize: 22, fontWeight: 'bold', lineHeight: 30, marginBottom: 24 },

  block:            { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  blockLabel:       { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  bodyText:         { fontSize: 15, lineHeight: 24 },

  keyPointRow:      { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  bullet:           { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  keyPointTitle:    { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  keyPointDetail:   { fontSize: 13, lineHeight: 19 },

  exampleScenario:  { fontSize: 15, fontWeight: '700', marginBottom: 8 },

  takeaway:         { borderRadius: 14, borderWidth: 1.5, padding: 18, marginBottom: 14, alignItems: 'center' },
  takeawayText:     { fontSize: 15, lineHeight: 22, textAlign: 'center', fontWeight: '600' },

  quizHeading:      { fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  quizCta:          { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderStyle: 'dashed' },
  quizCtaText:      { fontSize: 15, fontWeight: '700' },
  quizLoading:      { alignItems: 'center', paddingVertical: 20, gap: 10 },
  quizLoadingText:  { fontSize: 13 },

  quizBlock:        { borderRadius: 14, borderWidth: 1, padding: 16 },
  quizProgress:     { fontSize: 12, marginBottom: 8 },
  quizQuestion:     { fontSize: 16, fontWeight: '700', lineHeight: 24, marginBottom: 16 },
  option:           { borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 10 },
  optionText:       { fontSize: 15 },
  explanation:      { fontSize: 13, lineHeight: 20, marginVertical: 10 },
  nextBtn:          { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },

  feynmanHint:      { fontSize: 14, marginBottom: 12 },
  feynmanInput:     { borderRadius: 12, borderWidth: 1, minHeight: 100, padding: 14, marginBottom: 12 },

  quizResult:       { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: 'center' },
  quizResultScore:  { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  quizResultText:   { fontSize: 14, marginBottom: 16 },
  doneBtn:          { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },

  nextSectionBtn:   { marginTop: 32, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  retryBtn:         { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
})
