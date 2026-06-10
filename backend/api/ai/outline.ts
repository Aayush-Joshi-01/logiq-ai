// Stage 1 lazy generation: outline only (~200 tokens)
// Client gets headings + summaries immediately; content generated on demand later.

import { validateAuth, unauthorized } from '../../lib/auth'
import { checkRateLimit } from '../../lib/ratelimit'
import { getSubscriptionTier } from '../../lib/subscription'
import { callGeminiJSONWithUsage } from '../../lib/providers/gemini'
import { buildOutlinePrompt, UserContext } from '../../lib/prompts'
import { trackTokenUsage } from '../../lib/tokenUsage'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const { allowed } = await checkRateLimit(user.id, 'free')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Daily AI limit reached' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { topic, description } = await req.json()
  if (!topic?.trim()) {
    return new Response(JSON.stringify({ error: 'topic is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch user profile for personalization
  const { data: profile } = await supabase
    .from('profiles')
    .select('language, work_field, years_experience, learning_summary, skills')
    .eq('id', user.id)
    .single()

  const ctx: UserContext = {
    language:        profile?.language || req.headers.get('X-User-Language') || 'en',
    workField:       profile?.work_field,
    yearsExperience: profile?.years_experience,
    learningSummary: profile?.learning_summary,
    skills:          profile?.skills ?? [],
  }

  const prompt = buildOutlinePrompt({ topic, description, ctx })
  const tier   = await getSubscriptionTier(user.id)
  const apiKey = tier === 'pro' ? process.env.GEMINI_PAID_API_KEY! : process.env.GEMINI_FREE_API_KEY!

  const { text, promptTokens, completionTokens, totalTokens } = await callGeminiJSONWithUsage(apiKey, prompt, 'gemini-2.0-flash', 400)
  const parsed = JSON.parse(text)

  // Track token usage server-side
  await trackTokenUsage({
    userId: user.id,
    promptTokens,
    completionTokens,
    totalTokens,
    endpoint: 'outline',
  })

  // Persist course + sections to Supabase
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      user_id:     user.id,
      title:       parsed.title || topic,
      description: description || null,
      language:    ctx.language,
    })
    .select()
    .single()

  if (courseError || !course) {
    return new Response(JSON.stringify({ error: 'Failed to create course' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sections = (parsed.sections ?? []).map((s: any, i: number) => ({
    course_id: course.id,
    title:     s.title,
    summary:   s.summary,
    position:  s.position ?? i,
  }))

  const { data: insertedSections } = await supabase
    .from('course_sections')
    .insert(sections)
    .select()

  return Response.json({ course, sections: insertedSections ?? [] })
}
