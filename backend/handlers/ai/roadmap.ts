import { validateAuth, unauthorized } from '../../lib/auth'
import { checkRateLimit } from '../../lib/ratelimit'
import { getSubscriptionTier } from '../../lib/subscription'
import { callGeminiJSONWithUsage } from '../../lib/providers/gemini'
import { buildRoadmapGenerationPrompt, UserContext } from '../../lib/prompts'
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

  const { topic } = await req.json()
  if (!topic?.trim()) {
    return new Response(JSON.stringify({ error: 'topic is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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

  const prompt = buildRoadmapGenerationPrompt({ topic, ctx })
  const tier   = await getSubscriptionTier(user.id)
  const apiKey = tier === 'pro' ? process.env.GEMINI_PAID_API_KEY! : process.env.GEMINI_FREE_API_KEY!

  const { text, promptTokens, completionTokens, totalTokens } =
    await callGeminiJSONWithUsage(apiKey, prompt, 'gemini-flash-lite-latest', 1500)

  const parsed = JSON.parse(text)

  await trackTokenUsage({
    userId: user.id,
    promptTokens,
    completionTokens,
    totalTokens,
    endpoint: 'roadmap-generate',
  })

  const estimatedWeeks = Math.max(...(parsed.nodes ?? []).map((n: any) => n.week || 1), 1)

  const { data: roadmap, error } = await supabase
    .from('roadmaps')
    .insert({
      title:           parsed.title || topic,
      description:     parsed.description || null,
      nodes:           parsed.nodes  || [],
      edges:           parsed.edges  || [],
      is_generated:    true,
      is_public:       false,
      created_by:      user.id,
      language:        ctx.language,
      estimated_weeks: estimatedWeeks,
    })
    .select()
    .single()

  if (error || !roadmap) {
    return new Response(JSON.stringify({ error: 'Failed to save roadmap' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Auto-enroll so the roadmap appears in My Learning immediately
  await supabase.from('user_roadmaps').upsert(
    { user_id: user.id, roadmap_id: roadmap.id, status: 'active' },
    { onConflict: 'user_id,roadmap_id', ignoreDuplicates: true },
  )

  return Response.json({ roadmapId: roadmap.id })
}
