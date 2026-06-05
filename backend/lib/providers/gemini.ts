// Platform AI provider — Gemini.
// Used for ALL platform AI calls (free + pro tiers).
// Output normalized to OpenAI SSE format so StreamingText.jsx needs zero changes.
// Never expose which model/provider is used in any API response.

export async function streamGemini(apiKey: string, messages: any[], model = 'gemini-2.0-flash') {
  const systemInstruction = messages.find((m) => m.role === 'system')?.content
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const body: any = {
    contents,
    generationConfig: { maxOutputTokens: 800 },
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  )

  if (!res.ok || !res.body) {
    throw new Error(`Gemini API error: ${res.status}`)
  }

  return transformGeminiStream(res.body)
}

// Normalize Gemini SSE to OpenAI SSE format
// Gemini: data: {"candidates":[{"content":{"parts":[{"text":"token"}]}}]}
// Output: data: {"choices":[{"delta":{"content":"token"}}]}
function transformGeminiStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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
            if (!raw || raw === '[DONE]') continue
            try {
              const parsed = JSON.parse(raw)
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
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

export async function callGeminiJSON(apiKey: string, prompt: string, model = 'gemini-2.0-flash'): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens:  1500,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
}
