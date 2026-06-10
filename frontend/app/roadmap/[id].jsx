import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, Pressable, ActionSheetIOS, Platform, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { useRoadmapStore } from '../../store/roadmapStore'
import { useLearningStore } from '../../store/learningStore'
import { apiGet, apiPatch } from '../../lib/api'
import { GraphCanvas } from '../../components/RoadmapGraph/GraphCanvas'
import { useGraphLayout } from '../../components/RoadmapGraph/useGraphLayout'
import { TutorChat } from '../../components/AITutor/TutorChat'
import { ROUTES } from '../../constants/routes'
import { Feather } from '@expo/vector-icons'

const NODE_TYPE_LABEL = { concept: 'Concept', project: 'Project', assessment: 'Quiz', milestone: 'Milestone' }

export default function RoadmapScreen() {
  const { id } = useLocalSearchParams()
  const router  = useRouter()
  const theme   = useTheme()

  const insets = useSafeAreaInsets()

  const { roadmaps, setRoadmap, setCurrentRoadmap, updateNodeStatus } = useRoadmapStore()
  const { setCurrentRoadmapId, setCurrentNodeId } = useLearningStore()

  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [tutorOpen, setTutorOpen]       = useState(false)

  // Bottom sheet slide-up animation
  const sheetY    = useSharedValue(200)
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }))

  const roadmap = roadmaps[id]

  useEffect(() => {
    loadRoadmap()
  }, [id])

  async function loadRoadmap() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/api/roadmap/${id}`)
      setRoadmap(id, data.roadmap)
      setCurrentRoadmap(data.roadmap)
      setCurrentRoadmapId(id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const nodes = roadmap?.nodes || []
  const edges = roadmap?.edges || []
  const { layoutNodes, layoutEdges, width, height } = useGraphLayout(nodes, edges)

  function handleNodePress(node) {
    setSelectedNode(node)
    setSheetOpen(true)
    sheetY.value = withSpring(0, { damping: 18, stiffness: 120 })
  }

  function handleNodeLongPress(node) {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Skip Node', 'Bookmark'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) handleSkip(node); if (i === 2) handleBookmark(node) }
      )
    } else {
      Alert.alert(node.title, '', [
        { text: 'Skip Node', onPress: () => handleSkip(node) },
        { text: 'Bookmark', onPress: () => handleBookmark(node) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  function closeSheet() {
    sheetY.value = withTiming(200, { duration: 200 })
    setTimeout(() => { setSheetOpen(false); setSelectedNode(null) }, 200)
  }

  function handleSkip(node) {
    updateNodeStatus(id, node.id, 'completed')
    closeSheet()
  }

  function handleBookmark(_node) {
    // TODO: persist bookmark via API
    closeSheet()
  }

  function handleStartLesson(node) {
    setCurrentNodeId(node.id)
    closeSheet()
    router.push(ROUTES.LESSON(node.id))
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.error || '#ef4444', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity onPress={loadRoadmap} style={[styles.btn, { borderColor: theme.accent }]}>
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Back button — safe area aware */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="arrow-left" size={22} color={theme.textPrimary} />
      </TouchableOpacity>

      <GraphCanvas
        layoutNodes={layoutNodes}
        layoutEdges={layoutEdges}
        width={width}
        height={height}
        onNodePress={handleNodePress}
        onNodeLongPress={handleNodeLongPress}
      />

      {/* FAB — open AI Tutor */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => setTutorOpen(true)}
        activeOpacity={0.85}
      >
        <Feather name="message-circle" size={22} color={theme.accentText} />
      </TouchableOpacity>

      {/* Node bottom sheet */}
      {sheetOpen && selectedNode && (
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
          <Animated.View style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}>
            <View style={styles.sheetHandle} />
            <Pressable>
              <Text style={[styles.sheetType, { color: theme.accent }]}>
                {NODE_TYPE_LABEL[selectedNode.type] || selectedNode.type}
                {selectedNode.estimated_minutes ? `  ·  ~${selectedNode.estimated_minutes} min` : ''}
              </Text>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>{selectedNode.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {selectedNode.status === 'locked' && (
                  <Feather name="lock" size={13} color={theme.textMuted} />
                )}
                {selectedNode.status === 'completed' && (
                  <Feather name="check-circle" size={13} color={theme.accent} />
                )}
                <Text style={[styles.sheetStatus, { color: selectedNode.status === 'locked' ? theme.textMuted : theme.textSecondary }]}>
                  {selectedNode.status === 'completed'      ? 'Completed'
                    : selectedNode.status === 'in_progress' ? 'In Progress'
                    : selectedNode.status === 'available'   ? 'Ready to start'
                    : 'Locked'}
                </Text>
              </View>

              {(selectedNode.status === 'available' || selectedNode.status === 'in_progress') && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.accent }]}
                  onPress={() => handleStartLesson(selectedNode)}
                >
                  <Text style={{ color: theme.accentText, fontWeight: 'bold', fontSize: 16 }}>
                    {selectedNode.status === 'in_progress' ? 'Continue' : 'Start'}
                  </Text>
                </TouchableOpacity>
              )}

              {selectedNode.status === 'completed' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderWidth: 1.5, borderColor: theme.accent }]}
                  onPress={() => handleStartLesson(selectedNode)}
                >
                  <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 16 }}>Review</Text>
                </TouchableOpacity>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      {/* AI Tutor modal */}
      <Modal visible={tutorOpen} animationType="slide" presentationStyle="pageSheet">
        <TutorChat
          roadmapId={id}
          roadmapTitle={roadmap?.title}
          onClose={() => setTutorOpen(false)}
        />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btn:    { borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtn: {
    position: 'absolute', left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingTop: 12, minHeight: 240,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(116,140,171,0.4)',
    alignSelf: 'center', marginBottom: 20,
  },
  sheetType:   { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  sheetTitle:  { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  sheetStatus: { fontSize: 14, marginBottom: 20 },
  actionBtn:   { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
})
