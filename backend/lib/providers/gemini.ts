// Platform AI provider — Gemini.
// Used for ALL platform AI calls (free + pro tiers).
// Never expose which model/provider is used in any API response.
//
// Two paths:
//   streamGemini       — raw fetch, edge-runtime safe, normalises to OpenAI SSE
//   callGeminiJSONWithUsage — @google/genai SDK, Node serverless only, typed usageMetadata

import { GoogleGenAI } from '@google/genai'

// ─── SDK path (Node serverless: outline / content / quiz / explain) ───────────

export interface GeminiJSONResult {
  text: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export async function callGeminiJSONWithUsage(
  apiKey: string,
  prompt: string,
  model = 'gemini-flash-lite-latest',
  maxOutputTokens = 1500,
): Promise<GeminiJSONResult> {
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      maxOutputTokens,
      responseMimeType: 'application/json',
    },
  })

  const text  = response.text ?? '{}'
  const usage = response.usageMetadata

  return {
    text,
    promptTokens:     usage?.promptTokenCount     ?? 0,
    completionTokens: usage?.candidatesTokenCount ?? 0,
    totalTokens:      (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0),
  }
}

// Convenience wrapper for callers that don't need usage stats
export async function callGeminiJSON(
  apiKey: string,
  prompt: string,
  model = 'gemini-flash-lite-latest',
): Promise<string> {
  const { text } = await callGeminiJSONWithUsage(apiKey, prompt, model)
  return text
}

// ─── Raw fetch path (edge runtime: /api/ai/stream.ts only) ────────────────────
// Kept as raw fetch because edge runtime compatibility of @google/genai is not
// officially guaranteed — a future SDK update could silently add a Node built-in.

export async function streamGemini(
  apiKey: string,
  messages: any[],
  model = 'gemini-flash-lite-latest',
): Promise<ReadableStream<Uint8Array>> {
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
    throw new Error(`Gemini stream error: ${res.status}`)
  }

  return normaliseToOpenAISSE(res.body)
}

// Normalise Gemini SSE  →  OpenAI SSE format
// Gemini: data: {"candidates":[{"content":{"parts":[{"text":"token"}]}}]}
// Output: data: {"choices":[{"delta":{"content":"token"}}]}
// StreamingText.jsx on the frontend needs zero changes.
function normaliseToOpenAISSE(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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
                const chunk = JSON.stringify({ choices: [{ delta: { content: text } }] })
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
              }
            } catch {
              // skip malformed SSE chunk
            }
          }
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
