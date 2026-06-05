// BYOK only — never used for platform AI service.
// User supplies their own OpenAI key.

export async function streamOpenAI(apiKey: string, messages: any[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${apiKey}`,
      'Content-Type':   'application/json',
    },
    body: JSON.stringify({
      model:       'gpt-4o-mini',
      messages,
      stream:      true,
      max_tokens:  800,
      temperature: 0.7,
    }),
  })

  if (!res.ok || !res.body) throw new Error(`OpenAI API error: ${res.status}`)
  // OpenAI already produces SSE in our target format — pass through directly
  return res.body
}
