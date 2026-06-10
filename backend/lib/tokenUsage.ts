import { supabase } from './supabase'

export interface TokenUsagePayload {
  userId: string
  model?: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  endpoint: string
}

// Server-authoritative token tracking. Never trust client-reported counts.
export async function trackTokenUsage(payload: TokenUsagePayload): Promise<void> {
  const { userId, model = 'gemini-2.0-flash', promptTokens, completionTokens, totalTokens, endpoint } = payload
  try {
    await supabase.from('token_usage').insert({
      user_id:           userId,
      model,
      prompt_tokens:     promptTokens,
      completion_tokens: completionTokens,
      total_tokens:      totalTokens,
      endpoint,
      date:              new Date().toISOString().slice(0, 10),
    })
  } catch {
    // Non-fatal — never fail a generation request due to tracking errors
  }
}

export async function getDailyTokenUsage(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('token_usage')
    .select('total_tokens')
    .eq('user_id', userId)
    .eq('date', today)

  return (data ?? []).reduce((sum, r) => sum + (r.total_tokens || 0), 0)
}
