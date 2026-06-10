// Stage 2 lazy generation: one section's content on demand (~500 tokens)
// Called when user taps a section accordion. Result cached in DB.

import { validateAuth, unauthorized } from '../../lib/auth'
import { checkRateLimit } from '../../lib/ratelimit'
import { getSubscriptionTier } from '../../lib/subscription'
import { callGeminiJSONWithUsage } from '../../lib/providers/gemini'
import { buildSectionContentPrompt, UserContext } from '../../lib/prompts'
import { trackTokenUsage } from '../../lib/tokenUsage'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const { sectionId } = await req.json()
  if (!sectionId) {
    return new Response(JSON.stringify({ error: 'sectionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch section + course info
  const { data: section } = await supabase
    .from('course_sections')
    .select('id, title, summary, course_id, content_generated, courses(title, user_id)')
    .eq('id', sectionId)
    .single()

  if (!section) {
    return new Response(JSON.stringify({ error: 'Section not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  // RLS: only the course owner can generate content
  const course = section.courses as any
  if (course?.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  // Return cached content if already generated
  if (section.content_generated) {
    const { data: cached } = await supabase
      .from('section_content')
      .select('content')
      .eq('section_id', sectionId)
      .single()

    if (cached) {
      return Response.json({ content: cached.content, cached: true })
    }
  }

  const { allowed } = await checkRateLimit(user.id, 'free')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Daily AI limit reached' }), {
      status: 429,
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
    language:        profile?.language || 'en',
    workField:       profile?.work_field,
    yearsExperience: profile?.years_experience,
    learningSummary: profile?.learning_summary,
    skills:          profile?.skills ?? [],
  }

  const prompt = buildSectionContentPrompt({
    courseTitle:    course.title,
    sectionTitle:   section.title,
    sectionSummary: section.summary,
    ctx,
  })

  const tier   = await getSubscriptionTier(user.id)
  const apiKey = tier === 'pro' ? process.env.GEMINI_PAID_API_KEY! : process.env.GEMINI_FREE_API_KEY!

  const { text, promptTokens, completionTokens, totalTokens } = await callGeminiJSONWithUsage(apiKey, prompt, 'gemini-flash-lite-latest', 800)
  const content = JSON.parse(text)

  await Promise.all([
    supabase.from('section_content').upsert({ section_id: sectionId, content }, { onConflict: 'section_id' }),
    supabase.from('course_sections').update({ content_generated: true }).eq('id', sectionId),
    trackTokenUsage({ userId: user.id, promptTokens, completionTokens, totalTokens, endpoint: 'content' }),
  ])

  return Response.json({ content, cached: false })
}
