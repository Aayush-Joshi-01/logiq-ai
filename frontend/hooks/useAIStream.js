import { useSettingsStore } from '../store/settingsStore'
import { useLearningStore } from '../store/learningStore'
import { useAuthStore } from '../store/authStore'
import { getBYOKKey } from '../lib/secureStorage'
import { apiStream } from '../lib/api'

// Do NOT use EventSource — React Native / Hermes does not have it.
// Use fetch + ReadableStream reader instead.
export function useAIStream() {
  const { aiProvider } = useSettingsStore()

  async function sendMessage({ messages, nodeId, roadmapContext, onToken, onDone, onError }) {
    const byokKey = await getBYOKKey(aiProvider !== 'platform' ? aiProvider : null)

    let response
    try {
      response = await apiStream('/api/ai/stream', {
        messages,
        provider: aiProvider,
        nodeId,
        roadmapContext,
      }, byokKey)
    } catch (err) {
      onError?.(err)
      return
    }

    if (response.status === 429) {
      onDone?.({ rateLimited: true })
      return
    }

    if (!response.ok) {
      onError?.(new Error(`Stream failed: ${response.status}`))
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.replace('data: ', '').trim()
          if (data === '[DONE]') {
            onDone?.({ rateLimited: false })
            return
          }
          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content || ''
            if (token) onToken?.(token)
          } catch {
            // Malformed chunk — skip
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    onDone?.({ rateLimited: false })
  }

  return { sendMessage }
}
