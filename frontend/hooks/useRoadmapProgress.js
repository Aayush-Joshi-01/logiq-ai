import { useRoadmapStore } from '../store/roadmapStore'
import { apiGet } from '../lib/api'
import { getCachedRoadmap, cacheRoadmap } from '../lib/offline'

export function useRoadmapProgress(roadmapId) {
  const { roadmaps, setRoadmap } = useRoadmapStore()
  const roadmap = roadmaps[roadmapId]

  async function fetchRoadmap() {
    // Try offline cache first
    const cached = getCachedRoadmap(roadmapId)
    if (cached) setRoadmap(roadmapId, cached)

    try {
      const data = await apiGet(`/api/roadmap/${roadmapId}`)
      setRoadmap(roadmapId, data.roadmap)
      cacheRoadmap(roadmapId, data.roadmap)
    } catch (err) {
      if (!cached) throw err
      // Offline with cache — silently use cached version
    }
  }

  function getNodeStatus(nodeId) {
    if (!roadmap) return 'locked'
    const node = roadmap.nodes?.find((n) => n.id === nodeId)
    return node?.status || 'locked'
  }

  function getProgress() {
    if (!roadmap?.nodes) return { completed: 0, total: 0, percent: 0 }
    const completed = roadmap.nodes.filter((n) => n.status === 'completed').length
    const total = roadmap.nodes.length
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  return { roadmap, fetchRoadmap, getNodeStatus, getProgress }
}
