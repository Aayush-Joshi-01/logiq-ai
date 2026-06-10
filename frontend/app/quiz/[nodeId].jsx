import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator,
  SafeAreaView, Animated,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { useRoadmapStore } from '../../store/roadmapStore'
import { useLearningStore } from '../../store/learningStore'
import { apiPost, apiPatch } from '../../lib/api'
import { ROUTES } from '../../constants/routes'
import { COLORS } from '../../constants/theme'

const PASS_THRESHOLD  = 0.8   // 80%
const MCQ_DELAY_MS    = 1500  // show correct/wrong before advancing

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ─── MCQ Question ─────────────────────────────────────────────────────────────
function MCQQuestion({ question, onAnswer, disabled }) {
  const theme = useTheme()
  const [selected, setSelected] = useState(null)

  function handleSelect(idx) {
    if (disabled || selected !== null) return
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

  return (
    <View>
      <Text style={[styles.questionText, { color: theme.textPrimary }]}>{question.question}</Text>
      {question.options.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.option, getOptionStyle(i)]}
          onPress={() => handleSelect(i)}
          disabled={disabled || selected !== null}
          activeOpacity={0.75}
        >
          <Text style={[styles.optionLetter, { color: getOptionTextColor(i) }]}>
            {String.fromCharCode(65 + i)}
          </Text>
          <Text style={[styles.optionText, { color: getOptionTextColor(i) }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
      {selected !== null && question.explanation && (
        <View style={[styles.explanationCard, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <Text style={[styles.explanationText, { color: theme.textSecondary }]}>{question.explanation}</Text>
        </View>
      )}
    </View>
  )
}

// ─── Feynman Question ─────────────────────────────────────────────────────────
function FeynmanQuestion({ question, onSubmit, loading }) {
  const theme = useTheme()
  const [answer, setAnswer] = useState('')

  return (
    <View>
      <View style={[styles.feynmanBadge, { backgroundColor: 'rgba(116,140,171,0.1)', borderColor: theme.border }]}>
        <Text style={[styles.feynmanBadgeText, { color: theme.accent }]}>Explain it like I'm 10</Text>
      </View>
      <Text style={[styles.questionText, { color: theme.textPrimary }]}>{question.question}</Text>
      <TextInput
        style={[styles.feynmanInput, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.textPrimary }]}
        placeholder="Type your explanation in plain language…"
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
      >
        {loading
          ? <ActivityIndicator color={theme.accentText} />
          : <Text style={{ color: theme.accentText, fontWeight: 'bold', fontSize: 16 }}>Submit Answer</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

// ─── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({ passed, score, onRetry, onContinue, theme }) {
  return (
    <View style={styles.resultContainer}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>{passed ? '🎉' : '😅'}</Text>
      <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
        {passed ? 'Nice work!' : 'Not quite yet'}
      </Text>
      <Text style={[styles.resultScore, { color: passed ? COLORS.success : COLORS.warning }]}>
        {Math.round(score * 100)}%
      </Text>
      <Text style={[styles.resultSub, { color: theme.textSecondary }]}>
        {passed ? 'You passed! The next lesson is unlocked.' : 'You need 80% to pass. Give it another shot!'}
      </Text>
      {passed ? (
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.accent, marginTop: 32 }]} onPress={onContinue}>
          <Text style={{ color: theme.accentText, fontWeight: 'bold', fontSize: 16 }}>Continue →</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.elevated, borderWidth: 1, borderColor: theme.accent, marginTop: 32 }]} onPress={onRetry}>
          <Text style={{ color: theme.accent, fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function QuizScreen() {
  const { nodeId }  = useLocalSearchParams()
  const router      = useRouter()
  const theme       = useTheme()

  const { currentRoadmap, updateNodeStatus } = useRoadmapStore()
  const { currentRoadmapId } = useLearningStore()

  const node = currentRoadmap?.nodes?.find((n) => n.id === nodeId)

  const [quizData, setQuizData]         = useState(null)
  const [questions, setQuestions]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [currentIdx, setCurrentIdx]     = useState(0)
  const [scores, setScores]             = useState([])       // array of 0|1
  const [submitting, setSubmitting]     = useState(false)
  const [result, setResult]             = useState(null)     // { passed, score }
  const [mcqLocked, setMcqLocked]       = useState(false)

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
      })
      setQuizData(data)
      buildQuestions(data)
    } catch {
      setLoading(false)
    }
    setLoading(false)
  }

  function buildQuestions(data) {
    const mcqs    = shuffle(data.questions?.filter((q) => q.type === 'mcq') || [])
    const feynman = data.questions?.find((q) => q.type === 'feynman')
    // Q1-Q4 MCQ (up to 4), Q5 always Feynman
    const ordered = [...mcqs.slice(0, 4), feynman].filter(Boolean)
    setQuestions(ordered)
    setCurrentIdx(0)
    setScores([])
    setResult(null)
  }

  function handleMCQAnswer(correct, selectedIdx) {
    setMcqLocked(true)
    setTimeout(() => {
      setScores((prev) => [...prev, correct ? 1 : 0])
      setMcqLocked(false)
      setCurrentIdx((prev) => prev + 1)
    }, MCQ_DELAY_MS)
  }

  async function handleFeynmanSubmit(answer) {
    if (!answer.trim()) return
    setSubmitting(true)
    try {
      const data = await apiPost('/api/ai/feynman', {
        nodeId,
        nodeTitle: node?.title,
        answer,
      })
      const feynmanScore = data.score ?? 0  // 0–1
      const allScores    = [...scores, feynmanScore]
      const totalScore   = allScores.reduce((s, v) => s + v, 0) / allScores.length
      const passed       = totalScore >= PASS_THRESHOLD

      if (passed) {
        await completeNode(totalScore)
      }

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
      // Animate unlocked nodes
      if (res.unlockedNodes?.length) {
        res.unlockedNodes.forEach((unlockedId) => {
          updateNodeStatus(currentRoadmapId, unlockedId, 'available')
        })
      }
      updateNodeStatus(currentRoadmapId, nodeId, 'completed')
    } catch {
      // Progress save failed — not blocking
    }
  }

  function handleRetry() {
    buildQuestions(quizData)
  }

  function handleContinue() {
    router.push(ROUTES.ROADMAP(currentRoadmapId))
  }

  const currentQuestion = questions[currentIdx]
  const progress        = questions.length ? currentIdx / questions.length : 0

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={{ color: theme.textSecondary, marginTop: 16 }}>Generating quiz…</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: theme.accent, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Quiz</Text>
        {!result && (
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            {currentIdx + 1} / {questions.length}
          </Text>
        )}
      </View>

      {/* Progress bar */}
      {!result && (
        <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {result ? (
          <ResultScreen
            passed={result.passed}
            score={result.score}
            onRetry={handleRetry}
            onContinue={handleContinue}
            theme={theme}
          />
        ) : currentQuestion?.type === 'feynman' ? (
          <FeynmanQuestion
            question={currentQuestion}
            onSubmit={handleFeynmanSubmit}
            loading={submitting}
          />
        ) : currentQuestion ? (
          <MCQQuestion
            question={currentQuestion}
            onAnswer={handleMCQAnswer}
            disabled={mcqLocked}
          />
        ) : (
          <View style={styles.center}>
            <Text style={{ color: theme.textSecondary }}>No questions available.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:     { fontSize: 16, fontWeight: '600' },
  progressTrack:   { height: 3 },
  progressFill:    { height: 3, borderRadius: 2 },
  questionText:    { fontSize: 18, fontWeight: '600', lineHeight: 26, marginBottom: 20 },
  option:          { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 10 },
  optionLetter:    { width: 24, fontWeight: 'bold', fontSize: 15 },
  optionText:      { flex: 1, fontSize: 15, lineHeight: 22 },
  explanationCard: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 12 },
  explanationText: { fontSize: 14, lineHeight: 20 },
  feynmanBadge:    { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  feynmanBadgeText:{ fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  feynmanInput:    { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 22, minHeight: 140, marginBottom: 16 },
  submitBtn:       { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultContainer: { alignItems: 'center', paddingVertical: 32 },
  resultTitle:     { fontSize: 26, fontWeight: 'bold', marginBottom: 8 },
  resultScore:     { fontSize: 52, fontWeight: 'bold', marginBottom: 12 },
  resultSub:       { fontSize: 15, textAlign: 'center', lineHeight: 22 },
})
