import { useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { getSyncQueue, removeFromSyncQueue } from '../lib/offline'
import { apiPatch, apiPost } from '../lib/api'

export function useOfflineSync() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushSyncQueue()
      }
    })
    return unsubscribe
  }, [])
}

async function flushSyncQueue() {
  const queue = getSyncQueue()
  for (const item of queue) {
    try {
      await dispatchQueueItem(item)
      removeFromSyncQueue(item.id)
    } catch {
      // Leave in queue — retry on next reconnect
    }
  }
}

async function dispatchQueueItem(item) {
  switch (item.type) {
    case 'progress_update':
      return apiPatch('/api/progress/node', item.payload)
    case 'quiz_result':
      return apiPost('/api/progress/node', item.payload)
    case 'tutor_message':
      // Tutor messages are ephemeral — discard silently if offline too long
      return
    default:
      break
  }
}
