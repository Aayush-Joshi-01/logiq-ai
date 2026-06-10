import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { useRoadmapStore } from '../../store/roadmapStore'
import { useLearningStore } from '../../store/learningStore'
import { useSettingsStore } from '../../store/settingsStore'
import { apiPost, apiPatch } from '../../lib/api'
import { ROUTES } from '../../constants/routes'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '../../constants/theme'

const PASS_THRESHOLD = 0.8

const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi', ar: 'Arabic' }

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Normalise a question: convert "correct" string → correct_index number
function normaliseQuestion(q) {
  if (q.type !== 'mcq') return q
  const idx = q.options?.findIndex(
    (o) => o === q.correct || o?.trim() === q.correct?.trim()
  )
  return { ...q, correct_index: idx >= 0 ? idx : 0 }
}

// ─── MCQ Question ─────────────────────────────────────────────────────────────
function MCQQuestion({ question, onAnswer, onNext }) {
  const theme = useTheme()
  const [selected, setSelected] = useState(null)

  function handleSelect(idx) {
    if (selected !== null) return
    setSelected(idx)
    onAnswer(idx === question.correct_index, idx)
  }

  function getOptionStyle(idx) {
    if (selected === null) return { borderColor: theme.border, backgroundColor: theme.elevated }
    if (idx === question.correct_index) return { borderColor: COLORS.success, backgroundColor: 'rgba(34,197,94,0.12)' }
    if (idx === selected) return { borderColor: COLORS.error, backgroundColor: 'rgba(239,68,68,0.12)' }
    return { borderColor: theme.border, backgroundColor: theme.elevated, opacity: 0.5 }
  }

  function getOptionTextColor(idx) {
    if (selected === null) return theme.textPrimary
    if (idx === question.correct_index) return COLORS.success
    if (idx === selected) return COLORS.error
    return theme.textMuted
  }

  const answered = selected !== null
  const isCorrect = answered && selected === question.correct_index

  return (
    <View>
      <Text style={[styles.questionText, { color: theme.textPrimary }]}>{question.question}</Text>
      {question.options.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.option, getOptionStyle(i)]}
          onPress={() => handleSelect(i)}
          disabled={answered}
          activeOpacity={0.75}
        >
          <Text style={[styles.optionLetter, { color: getOptionTextColor(i) }]}>
            {String.fromCharCode(65 + i)}
          </Text>
          <Text style={[styles.optionText, { color: getOptionTextColor(i) }]}>{opt}</Text>
          {answered && i === question.correct_index && (
            <Feather name="check-circle" size={16} color={COLORS.success} style={{ marginLeft: 6 }} />
          )}
          {answered && i === selected && i !== question.correct_index && (
            <Feather name="x-circle" size={16} color={COLORS.error} style={{ marginLeft: 6 }} />
          )}
        </TouchableOpacity>
      ))}

      {answered && (
        <>
          {question.explanation ? (
            <View style={[styles.explanationCard, {
              backgroundColor: isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              borderColor: isCorrect ? COLORS.success : COLORS.error,
            }]}>
              <Text style={[styles.explanationLabel, { color: isCorrect ? COLORS.success : COLORS.error }]}>
                {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </Text>
              <Text style={[styles.explanationText, { color: theme.textSecondary }]}>{question.explanation}</Text>
            </View>
          ) : (
            <View style={[styles.explanationCard, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
              <Text style={[styles.explanationLabel, { color: isCorrect ? COLORS.success : COLORS.error }]}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: theme.accent }]}
            onPress={onNext}
            activeOpacity={0.85}
          >
            <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 16 }}>Next →</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

// ─── Feynman Question ─────────────────────────────────────────────────────────
function FeynmanQuestion({ question, onSubmit, loading, language }) {
  const theme = useTheme()
  const [answer, setAnswer] = useState('')
  const langHint = language === 'Hindi' ? 'हिंदी में लिखें…' : language === 'Arabic' ? 'اكتب هنا…' : 'Type your explanation in plain language…'

  return (
    <View>
      <View style={[styles.feynmanBadge, { backgroundColor: 'rgba(116,140,171,0.1)', borderColor: theme.border }]}>
        <Text style={[styles.feynmanBadgeText, { color: theme.accent }]}>Explain it like I'm 10</Text>
      </View>
      <Text style={[styles.questionText, { color: theme.textPrimary }]}>{question.question}</Text>
      <TextInput
        style={[styles.feynmanInput, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.textPrimary }]}
        placeholder={langHint}
        placeholderTextColor={theme.textMuted}
        value={answer}
        onChangeText={setAnswer}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: answer.trim().length < 20 ? theme.elevated : theme.accent }]}
        onPress={() => onSubmit(answer)}
        disabled={answer.trim().length < 20 || loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color={theme.accentText} />
          : <Text style={{ color: theme.accentText, fontWeight: 'bold', fontSize: 16 }}>Submit Answer</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

// ─── Result Screen ────────────────────────────────────────────────────────────
function ResultScreen({ passed, score, feynmanFeedback, onRetry, onContinue, theme }) {
  return (
    <View style={styles.resultContainer}>
      <Feather
        name={passed ? 'award' : 'refresh-cw'}
        size={56}
        color={passed ? COLORS.success : COLORS.warning}
        style={{ marginBottom: 16 }}
      />
      <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
        {passed ? 'Great work!' : 'Keep going!'}
      </Text>
      <Text style={[styles.resultScore, { color: passed ? COLORS.success : COLORS.warning }]}>
        {Math.round(score * 100)}%
      </Text>
      <Text style={[styles.resultSub, { color: theme.textSecondary }]}>
        {passed
          ? 'You passed! The next node is now unlocked.'
          : 'You need 80% to pass. Review the lesson and try again.'}
      </Text>

      {feynmanFeedback ? (
        <View style={[styles.feynmanFeedbackCard, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <Text style={[styles.feynmanFeedbackLabel, { color: theme.accent }]}>AI Feedback</Text>
          <Text style={[styles.feynmanFeedbackText, { color: theme.textSecondary }]}>{feynmanFeedback}</Text>
        </View>
      ) : null}

      <View style={styles.resultActions}>
        <TouchableOpacity
          style={[styles.resultBtn, { borderWidth: 1.5, borderColor: theme.accent, flex: 1 }]}
          onPress={onRetry}
        >
          <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 15 }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resultBtn, { backgroundColor: theme.accent, flex: 1 }]}
          onPress={onContinue}
        >
          <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 15 }}>
            {passed ? 'Continue →' : 'Back to Roadmap'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function QuizScreen() {
  const { nodeId }  = useLocalSearchParams()
  const router      = useRouter()
  const theme       = useTheme()
  const insets      = useSafeAreaInsets()

  const { currentRoadmap, updateNodeStatus } = useRoadmapStore()
  const { currentRoadmapId } = useLearningStore()
  const { language } = useSettingsStore()
  const languageName = LANGUAGE_NAMES[language] || 'English'

  const node = currentRoadmap?.nodes?.find((n) => n.id === nodeId)

  const [quizData, setQuizData]           = useState(null)
  const [questions, setQuestions]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [currentIdx, setCurrentIdx]       = useState(0)
  const [scores, setScores]               = useState([])
  const [submitting, setSubmitting]       = useState(false)
  const [result, setResult]               = useState(null)
  const [feynmanFeedback, setFeedback]    = useState(null)

  useEffect(() => {
    loadQuiz()
  }, [nodeId])

  async function loadQuiz() {
    setLoading(true)
    try {
      const data = await apiPost('/api/ai/quiz', {
        nodeId,
        nodeTitle: node?.title,
        nodeType:  node?.type,
        roadmapId: currentRoadmapId,
        language:  languageName,
      })
      setQuizData(data)
      buildQuestions(data)
    } catch {
      // keep loading=false below
    }
    setLoading(false)
  }

  function buildQuestions(data) {
    const raw     = data.questions || []
    const mcqs    = shuffle(raw.filter((q) => q.type === 'mcq').map(normaliseQuestion))
    const feynman = raw.find((q) => q.type === 'feynman')
    const ordered = [...mcqs.slice(0, 4), feynman].filter(Boolean)
    setQuestions(ordered)
    setCurrentIdx(0)
    setScores([])
    setResult(null)
    setFeedback(null)
  }

  function handleMCQAnswer(correct) {
    setScores((prev) => [...prev, correct ? 1 : 0])
  }

  function handleMCQNext() {
    setCurrentIdx((prev) => prev + 1)
  }

  async function handleFeynmanSubmit(answer) {
    if (!answer.trim()) return
    setSubmitting(true)
    try {
      const data = await apiPost('/api/ai/feynman', {
        concept:     node?.title,
        explanation: answer,
        language:    languageName,
      })
      // Backend returns score 0-100; normalise to 0-1 to match MCQ scoring
      const feynmanScore = (data.score ?? 0) / 100
      const allScores    = [...scores, feynmanScore]
      const totalScore   = allScores.reduce((s, v) => s + v, 0) / allScores.length
      const passed       = totalScore >= PASS_THRESHOLD

      if (passed) await completeNode(totalScore)

      setFeedback(data.feedback || null)
      setResult({ passed, score: totalScore })
    } catch {
      setResult({ passed: false, score: 0 })
    } finally {
      setSubmitting(false)
    }
  }

  async function completeNode(score) {
    try {
      const res = await apiPatch('/api/progress/node', {
        nodeId,
        roadmapId: currentRoadmapId,
        quizScore: Math.round(score * 100),
      })
      if (res.unlockedNodes?.length) {
        res.unlockedNodes.forEach((id) => updateNodeStatus(currentRoadmapId, id, 'available'))
      }
      updateNodeStatus(currentRoadmapId, nodeId, 'completed')
    } catch {
      // non-blocking
    }
  }

  function handleRetry() { buildQuestions(quizData) }
  function handleContinue() { router.push(ROUTES.ROADMAP(currentRoadmapId)) }

  const currentQuestion = questions[currentIdx]
  const totalQ          = questions.length
  const progressPct     = totalQ ? (currentIdx / totalQ) * 100 : 0

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={{ color: theme.textSecondary, marginTop: 16 }}>Generating quiz…</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={20} color={theme.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {node?.title || 'Quiz'}
          </Text>
          {!result && (
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
              Question {Math.min(currentIdx + 1, totalQ)} of {totalQ}
            </Text>
          )}
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Progress bar */}
      {!result && (
        <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.accent }]} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {result ? (
          <ResultScreen
            passed={result.passed}
            score={result.score}
            feynmanFeedback={feynmanFeedback}
            onRetry={handleRetry}
            onContinue={handleContinue}
            theme={theme}
          />
        ) : currentQuestion?.type === 'feynman' ? (
          <FeynmanQuestion
            key={currentIdx}
            question={currentQuestion}
            onSubmit={handleFeynmanSubmit}
            loading={submitting}
            language={languageName}
          />
        ) : currentQuestion ? (
          <MCQQuestion
            key={currentIdx}
            question={currentQuestion}
            onAnswer={handleMCQAnswer}
            onNext={handleMCQNext}
          />
        ) : (
          <View style={[styles.center, { paddingTop: 80 }]}>
            <Text style={{ color: theme.textSecondary }}>No questions available.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  center:         { alignItems: 'center', justifyContent: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:    { fontSize: 16, fontWeight: '700' },
  progressTrack:  { height: 3 },
  progressFill:   { height: 3 },

  questionText:   { fontSize: 18, fontWeight: '600', lineHeight: 26, marginBottom: 20 },
  option:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 10 },
  optionLetter:   { width: 24, fontWeight: 'bold', fontSize: 15 },
  optionText:     { flex: 1, fontSize: 15, lineHeight: 22 },

  explanationCard:  { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 8 },
  explanationLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  explanationText:  { fontSize: 14, lineHeight: 21 },

  nextBtn:        { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },

  feynmanBadge:     { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  feynmanBadgeText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  feynmanInput:     { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 22, minHeight: 140, marginBottom: 16 },
  submitBtn:        { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },

  resultContainer:   { alignItems: 'center', paddingVertical: 24 },
  resultTitle:       { fontSize: 26, fontWeight: 'bold', marginBottom: 8 },
  resultScore:       { fontSize: 52, fontWeight: 'bold', marginBottom: 12 },
  resultSub:         { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  resultActions:     { flexDirection: 'row', gap: 12, width: '100%' },
  resultBtn:         { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },

  feynmanFeedbackCard:  { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24, width: '100%' },
  feynmanFeedbackLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  feynmanFeedbackText:  { fontSize: 14, lineHeight: 21 },
})
