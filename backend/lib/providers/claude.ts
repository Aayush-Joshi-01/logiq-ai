// BYOK only — V2. Never used for platform AI service.
// Output normalized to OpenAI SSE format.

export async function streamClaude(apiKey: string, messages: any[]) {
  const system   = messages.find((m) => m.role === 'system')?.content
  const filtered = messages.filter((m) => m.role !== 'system')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system,
      messages:   filtered,
      stream:     true,
    }),
  })

  if (!res.ok || !res.body) throw new Error(`Claude API error: ${res.status}`)
  return transformClaudeStream(res.body)
}

// Normalize Claude SSE to OpenAI SSE format
function transformClaudeStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue
            try {
              const parsed = JSON.parse(raw)
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                const text = parsed.delta.text
                const openaiChunk = JSON.stringify({ choices: [{ delta: { content: text } }] })
                controller.enqueue(encoder.encode(`data: ${openaiChunk}\n\n`))
              }
            } catch {
              // Skip malformed chunk
            }
          }
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
