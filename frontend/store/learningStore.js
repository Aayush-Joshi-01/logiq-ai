import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const useLearningStore = create(
  persist(
    (set) => ({
      activeRoadmaps:   [],
      currentRoadmapId: null,
      currentNodeId:    null,
      streak: {
        current:        0,
        longest:        0,
        lastActiveDate: null,
        totalXP:        0,
      },
      totalMinutes: 0,
      // V2
      srsQueue:       [],               // nodes due for review today
      inferredLevel:  'beginner',       // updated by adaptive difficulty hook

      setActiveRoadmaps:   (activeRoadmaps) => set({ activeRoadmaps }),
      setCurrentRoadmapId: (currentRoadmapId) => set({ currentRoadmapId }),
      setCurrentNodeId:    (currentNodeId) => set({ currentNodeId }),
      setStreak:           (streak) => set({ streak }),
      addMinutes:          (minutes) => set((s) => ({ totalMinutes: s.totalMinutes + minutes })),
      setSRSQueue:         (srsQueue) => set({ srsQueue }),
      setInferredLevel:    (inferredLevel) => set({ inferredLevel }),

      clearLearning: () => set({
        activeRoadmaps: [],
        currentRoadmapId: null,
        currentNodeId: null,
        streak: { current: 0, longest: 0, lastActiveDate: null, totalXP: 0 },
        totalMinutes: 0,
        srsQueue: [],
        inferredLevel: 'beginner',
      }),
    }),
    {
      name: 'logiq-learning',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
