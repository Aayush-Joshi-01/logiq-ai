// BYOK only — V2. Never used for platform AI service.
// apiKey format for Azure: "endpoint|key" (pipe-separated)

export async function streamAzure(apiKey: string, messages: any[]) {
  const [endpoint, key] = apiKey.split('|')
  if (!endpoint || !key) throw new Error('Azure BYOK key must be "endpoint|key"')

  const res = await fetch(`${endpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01`, {
    method: 'POST',
    headers: {
      'api-key':      key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      stream:     true,
      max_tokens: 800,
    }),
  })

  if (!res.ok || !res.body) throw new Error(`Azure API error: ${res.status}`)
  // Azure OpenAI uses same SSE format as OpenAI — pass through directly
  return res.body
}
