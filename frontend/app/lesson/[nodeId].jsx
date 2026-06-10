import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Pressable,
  StyleSheet, ActivityIndicator, Modal, SafeAreaView,
  Clipboard, Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { useRoadmapStore } from '../../store/roadmapStore'
import { useLearningStore } from '../../store/learningStore'
import { apiPost } from '../../lib/api'
import { preCacheNode } from '../../lib/offline'
import { TutorChat } from '../../components/AITutor/TutorChat'
import { RateLimitBanner } from '../../components/Common/RateLimitBanner'
import { ROUTES } from '../../constants/routes'
import { COLORS } from '../../constants/theme'

// ─── CodeBlock ────────────────────────────────────────────────────────────────
function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    Clipboard.setString(code)
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{language || 'code'}</Text>
        <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.copyBtn}>{copied ? '✓ Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText}>{code}</Text>
      </ScrollView>
    </View>
  )
}

// ─── AccordionSection ─────────────────────────────────────────────────────────
function AccordionSection({ title, children, theme }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={{ marginTop: 8 }}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        style={[styles.accordionHeader, { borderColor: theme.border }]}
      >
        <Text style={[styles.accordionTitle, { color: theme.accent }]}>{title}</Text>
        <Text style={{ color: theme.accent, fontSize: 16 }}>{open ? '−' : '+'}</Text>
      </TouchableOpacity>
      {open && <View style={[styles.accordionBody, { borderColor: theme.border }]}>{children}</View>}
    </View>
  )
}

// ─── Block renderers ──────────────────────────────────────────────────────────
function renderBlock(block, theme, idx) {
  switch (block.type) {
    case 'core_concept':
      return (
        <View key={idx} style={styles.section}>
          <Text style={[styles.blockLabel, { color: theme.accent }]}>CORE CONCEPT</Text>
          <Text style={[styles.bodyText, { color: theme.textPrimary }]}>{block.content}</Text>
        </View>
      )
    case 'visual':
      return (
        <View key={idx} style={[styles.section, styles.visualPlaceholder, { borderColor: theme.border }]}>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>Visual · {block.caption || 'Diagram'}</Text>
        </View>
      )
    case 'code_example':
      return (
        <View key={idx} style={styles.section}>
          <Text style={[styles.blockLabel, { color: theme.accent }]}>CODE EXAMPLE</Text>
          {block.caption && <Text style={[styles.caption, { color: theme.textSecondary }]}>{block.caption}</Text>}
          <CodeBlock code={block.content} language={block.language} />
        </View>
      )
    case 'try_it':
      return (
        <View key={idx} style={[styles.section, styles.tryItCard, { backgroundColor: 'rgba(116,140,171,0.1)', borderColor: 'rgba(116,140,171,0.25)' }]}>
          <Text style={[styles.blockLabel, { color: theme.accent }]}>TRY IT</Text>
          <Text style={[styles.bodyText, { color: theme.textPrimary }]}>{block.content}</Text>
        </View>
      )
    case 'go_deeper':
      return (
        <View key={idx} style={styles.section}>
          <AccordionSection title="Go Deeper" theme={theme}>
            <Text style={[styles.bodyText, { color: theme.textPrimary }]}>{block.content}</Text>
            {block.links?.map((link, i) => (
              <Text key={i} style={[styles.link, { color: theme.accent }]}>{link.title || link.url}</Text>
            ))}
          </AccordionSection>
        </View>
      )
    default:
      return null
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LessonScreen() {
  const { nodeId }  = useLocalSearchParams()
  const router      = useRouter()
  const theme       = useTheme()

  const { currentRoadmap } = useRoadmapStore()
  const { currentRoadmapId } = useLearningStore()

  const node = currentRoadmap?.nodes?.find((n) => n.id === nodeId)

  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [tutorOpen, setTutorOpen]     = useState(false)

  useEffect(() => {
    if (!nodeId) return
    loadExplanation()
    // Fire-and-forget pre-cache for offline use
    preCacheNode(nodeId, 'en').catch(() => {})
  }, [nodeId])

  async function loadExplanation() {
    setLoading(true)
    try {
      const data = await apiPost('/api/ai/explain', {
        nodeId,
        roadmapId: currentRoadmapId,
        nodeTitle: node?.title,
        nodeType:  node?.type,
      })
      setExplanation(data)
    } catch {
      // Show placeholder content on failure
      setExplanation({ blocks: [] })
    } finally {
      setLoading(false)
    }
  }

  function handleUnderstand() {
    router.push(ROUTES.QUIZ(nodeId))
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: theme.accent, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {node?.title || 'Lesson'}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <RateLimitBanner />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} size="large" />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>Preparing your lesson…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Node meta */}
            <Text style={[styles.nodeType, { color: theme.accent }]}>
              {node?.type?.toUpperCase() || 'LESSON'}
              {node?.estimated_minutes ? `  ·  ~${node.estimated_minutes} min` : ''}
            </Text>
            <Text style={[styles.nodeTitle, { color: theme.textPrimary }]}>{node?.title}</Text>

            {/* Content blocks in spec order */}
            {(explanation?.blocks || []).map((block, i) => renderBlock(block, theme, i))}

            {/* Empty state if no blocks */}
            {(!explanation?.blocks?.length) && (
              <Text style={[styles.bodyText, { color: theme.textSecondary, textAlign: 'center', marginTop: 32 }]}>
                Lesson content will appear here once the AI generates it.
              </Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.outlinedBtn, { borderColor: theme.accent, flex: 1 }]}
          onPress={() => setTutorOpen(true)}
        >
          <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 15 }}>Ask AI 💬</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filledBtn, { backgroundColor: theme.accent, flex: 1.5 }]}
          onPress={handleUnderstand}
        >
          <Text style={{ color: theme.accentText, fontWeight: 'bold', fontSize: 15 }}>I understand this ✓</Text>
        </TouchableOpacity>
      </View>

      {/* AI Tutor modal */}
      <Modal visible={tutorOpen} animationType="slide" presentationStyle="pageSheet">
        <TutorChat
          roadmapId={currentRoadmapId}
          nodeId={nodeId}
          nodeTitle={node?.title}
          onClose={() => setTutorOpen(false)}
        />
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:   { fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  content:       { padding: 20 },
  nodeType:      { fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  nodeTitle:     { fontSize: 24, fontWeight: 'bold', marginBottom: 24, lineHeight: 30 },
  section:       { marginBottom: 24 },
  blockLabel:    { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  bodyText:      { fontSize: 15, lineHeight: 24 },
  caption:       { fontSize: 13, marginBottom: 8, lineHeight: 18 },
  visualPlaceholder: { height: 180, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  codeBlock:     { backgroundColor: '#0D1321', borderRadius: 10, overflow: 'hidden' },
  codeHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  codeLanguage:  { color: 'rgba(240,235,216,0.5)', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyBtn:       { color: '#748CAB', fontSize: 12, fontWeight: '600' },
  codeText:      { color: '#F0EBD8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, lineHeight: 20, padding: 14 },
  tryItCard:     { borderRadius: 12, borderWidth: 1, padding: 16 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  accordionTitle:  { fontSize: 15, fontWeight: '600' },
  accordionBody:   { paddingTop: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 12 },
  link:            { fontSize: 14, marginTop: 8, textDecorationLine: 'underline' },
  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28, borderTopWidth: StyleSheet.hairlineWidth },
  outlinedBtn:   { borderWidth: 1.5, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  filledBtn:     { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
})
