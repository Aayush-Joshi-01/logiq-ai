import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import { useRoadmapStore } from '../../store/roadmapStore'
import { apiGet, apiPost } from '../../lib/api'
import { LoadingSkeleton } from '../../components/Common/LoadingSkeleton'
import { OfflineBanner } from '../../components/Common/OfflineBanner'
import { ROUTES } from '../../constants/routes'

const CATEGORIES = ['All', 'Web Dev', 'Python', 'Mobile', 'DevOps', 'Data Science', 'AI/ML', 'Beginner']

// ─── Roadmap Grid Card ─────────────────────────────────────────────────────────
function RoadmapGridCard({ roadmap, isEnrolled, onEnroll, onView, theme }) {
  const nodeCount  = roadmap.nodes?.length || 0
  const weekCount  = roadmap.nodes?.reduce((max, n) => Math.max(max, n.week || 1), 1) || 1

  return (
    <View style={[styles.gridCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.cardAccent, { backgroundColor: theme.accent }]} />
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
          {roadmap.title}
        </Text>
        {roadmap.description && (
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {roadmap.description}
          </Text>
        )}
        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>
            {nodeCount} nodes · {weekCount}w
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.cardBtn,
            isEnrolled
              ? { borderWidth: 1.5, borderColor: theme.accent }
              : { backgroundColor: theme.accent },
          ]}
          onPress={() => isEnrolled ? onView(roadmap.id) : onEnroll(roadmap)}
          activeOpacity={0.8}
        >
          <Text style={{ color: isEnrolled ? theme.accent : theme.accentText, fontWeight: '700', fontSize: 14 }}>
            {isEnrolled ? 'Continue →' : 'Start Learning'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const theme  = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { user }     = useAuthStore()
  const { roadmaps } = useRoadmapStore()

  const [allRoadmaps, setAllRoadmaps]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [enrolling, setEnrolling]       = useState(null)
  const [search, setSearch]             = useState('')
  const [activeCategory, setCategory]   = useState('All')

  const [genVisible, setGenVisible]     = useState(false)
  const [genTopic, setGenTopic]         = useState('')
  const [generating, setGenerating]     = useState(false)

  const enrolledIds = new Set(Object.keys(roadmaps))

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await apiGet('/api/roadmap')
      setAllRoadmaps(data?.roadmaps || [])
    } catch {
      // offline — keep existing
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

  // Filter by search + category
  const filtered = useMemo(() => {
    let list = allRoadmaps
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) =>
        r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
      )
    }
    if (activeCategory !== 'All') {
      list = list.filter((r) =>
        r.title?.toLowerCase().includes(activeCategory.toLowerCase()) ||
        r.category?.toLowerCase().includes(activeCategory.toLowerCase())
      )
    }
    return list
  }, [allRoadmaps, search, activeCategory])

  async function handleGenerate() {
    if (!user) {
      Alert.alert('Sign in required', 'Create a free account to generate personalised roadmaps.')
      return
    }
    if (!genTopic.trim()) return
    setGenerating(true)
    try {
      const { roadmapId } = await apiPost('/api/ai/roadmap', { topic: genTopic.trim() })
      setGenVisible(false)
      setGenTopic('')
      load(true) // refresh list so new roadmap appears
      router.push(ROUTES.ROADMAP(roadmapId))
    } catch (err) {
      Alert.alert('Generation failed', err?.message || 'Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleEnroll(roadmap) {
    if (!user) {
      Alert.alert('Sign in required', 'Create a free account to track your progress.')
      return
    }
    setEnrolling(roadmap.id)
    try {
      // POST /api/roadmap/[id] to enroll (creates user_roadmaps row)
      await apiPost(`/api/roadmap/${roadmap.id}/enroll`, {})
      router.push(ROUTES.ROADMAP(roadmap.id))
    } catch {
      // Even if enroll API fails, navigate to roadmap (guest-like view)
      router.push(ROUTES.ROADMAP(roadmap.id))
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OfflineBanner />

      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border, paddingTop: insets.top + 8 }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <Feather name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search roadmaps…"
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: theme.textMuted, fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.chipsRow, { borderBottomColor: theme.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.chip,
              {
                backgroundColor: activeCategory === cat ? theme.accent : theme.elevated,
                borderColor: activeCategory === cat ? theme.accent : theme.border,
              },
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text style={{
              color: activeCategory === cat ? theme.accentText : theme.textSecondary,
              fontSize: 13,
              fontWeight: '600',
            }}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Generate roadmap modal */}
      <Modal visible={genVisible} transparent animationType="slide" onRequestClose={() => setGenVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setGenVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Generate a Roadmap</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Describe what you want to learn — AI will build a personalised path for you.
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="e.g. Learn Rust, Personal finance, Public speaking…"
              placeholderTextColor={theme.textMuted}
              value={genTopic}
              onChangeText={setGenTopic}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleGenerate}
            />
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.accent, opacity: (!genTopic.trim() || generating) ? 0.6 : 1 }]}
              onPress={handleGenerate}
              disabled={!genTopic.trim() || generating}
            >
              {generating
                ? <ActivityIndicator color={theme.accentText} />
                : <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 16 }}>Generate Roadmap</Text>
              }
            </TouchableOpacity>
            {generating && (
              <Text style={[styles.modalHint, { color: theme.textMuted }]}>Building your roadmap… ~10s</Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Roadmap grid */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} variant="card" style={styles.gridSkeleton} />
          ))}
        </ScrollView>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="map" size={40} color={theme.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No roadmaps found</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            {search ? 'Try a different search term or generate one below' : 'Generate a personalised roadmap with AI'}
          </Text>
          <TouchableOpacity
            style={[styles.genBtnLarge, { backgroundColor: theme.accent, marginTop: 20 }]}
            onPress={() => setGenVisible(true)}
          >
            <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 15 }}>Generate with AI</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
          ListHeaderComponent={
            <TouchableOpacity
              style={[styles.genBanner, { backgroundColor: theme.elevated, borderColor: theme.border }]}
              onPress={() => setGenVisible(true)}
              activeOpacity={0.8}
            >
              <Feather name="zap" size={20} color={theme.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 14 }}>Generate a Roadmap</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>AI builds a personalised learning path for any topic</Text>
              </View>
              <Text style={{ color: theme.accent, fontSize: 18 }}>→</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              {enrolling === item.id ? (
                <View style={[styles.gridCard, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', minHeight: 160 }]}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              ) : (
                <RoadmapGridCard
                  roadmap={item}
                  isEnrolled={enrolledIds.has(item.id)}
                  onEnroll={handleEnroll}
                  onView={(id) => router.push(ROUTES.ROADMAP(id))}
                  theme={theme}
                />
              )}
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBar:       { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:     { flex: 1, fontSize: 15 },
  chipsRow:        { flexShrink: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  chip:            { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 6 },
  grid:            { padding: 12, paddingBottom: 40 },
  gridRow:         { gap: 12, marginBottom: 12 },
  gridSkeleton:    { flex: 1, height: 200 },
  gridCard:        { borderRadius: 14, borderWidth: 1, overflow: 'hidden', flex: 1 },
  cardAccent:      { height: 4 },
  cardBody:        { padding: 14 },
  cardTitle:       { fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 6 },
  cardDesc:        { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  cardMeta:        { marginBottom: 12 },
  cardMetaText:    { fontSize: 11 },
  cardBtn:         { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  emptyState:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc:       { fontSize: 14, textAlign: 'center' },
  genBanner:       { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  genBtnLarge:     { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  // modal
  modalBackdrop:   { flex: 1 },
  modalSheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, padding: 24, paddingBottom: 40 },
  modalHandle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:      { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  modalSubtitle:   { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  modalInput:      { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 16 },
  modalBtn:        { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  modalHint:       { fontSize: 13, textAlign: 'center' },
})
