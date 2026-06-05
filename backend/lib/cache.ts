import { supabase } from './supabase'

export async function getCached(cacheKey: string): Promise<string | null> {
  const { data } = await supabase
    .from('ai_cache')
    .select('content')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  return data?.content ?? null
}

export async function setCached(
  cacheKey: string,
  content: string,
  provider: string = 'platform',
  ttlDays: number = 30
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('ai_cache').upsert({
    cache_key:  cacheKey,
    content,
    provider,   // always 'platform' for our AI — never reveals Gemini
    expires_at: expiresAt,
  }, { onConflict: 'cache_key' })
}
