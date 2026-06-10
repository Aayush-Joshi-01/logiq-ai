import { create } from 'zustand'

// Session-only — not persisted. Fresh fetch on each roadmap open.
export const useRoadmapStore = create((set) => ({
  roadmaps:     {},  // keyed by id: { ...roadmap, nodes: [{...node, status}] }
  userRoadmaps: {},  // keyed by roadmap_id: user_roadmaps row
  currentRoadmap: null,

  setRoadmap:       (id, roadmap) => set((s) => ({ roadmaps: { ...s.roadmaps, [id]: roadmap } })),
  setUserRoadmap:   (roadmapId, ur) => set((s) => ({ userRoadmaps: { ...s.userRoadmaps, [roadmapId]: ur } })),
  setCurrentRoadmap: (roadmap) => set({ currentRoadmap: roadmap }),

  updateNodeStatus: (roadmapId, nodeId, status) =>
    set((s) => {
      const roadmap = s.roadmaps[roadmapId]
      if (!roadmap) return {}
      return {
        roadmaps: {
          ...s.roadmaps,
          [roadmapId]: {
            ...roadmap,
            nodes: roadmap.nodes.map((n) =>
              n.id === nodeId ? { ...n, status } : n
            ),
          },
        },
      }
    }),

  clearRoadmaps: () => set({ roadmaps: {}, userRoadmaps: {}, currentRoadmap: null }),
}))
