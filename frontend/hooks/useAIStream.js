import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import { getBYOKKey } from '../lib/secureStorage'
import { apiStream } from '../lib/api'

// Do NOT use EventSource — React Native / Hermes does not have it.
// Uses fetch + ReadableStream reader.
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

    // Rate limit header already consumed by apiStream → settingsStore updated there
    if (response.status === 429) {
      useSettingsStore.getState().setCallsRemaining(0)
      onDone?.({ rateLimited: true })
      return
    }

    if (!response.ok) {
      onError?.(new Error(`Stream failed: ${response.status}`))
      return
    }

    const reader  = response.body.getReader()
    const decoder = new TextDecoder()
    let   buffer  = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Keep the last potentially-incomplete line in the buffer
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            onDone?.({ rateLimited: false })
            return
          }
          try {
            const parsed = JSON.parse(data)
            const token  = parsed.choices?.[0]?.delta?.content || ''
            if (token) onToken?.(token)
          } catch {
            // Incomplete JSON chunk — skip
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
