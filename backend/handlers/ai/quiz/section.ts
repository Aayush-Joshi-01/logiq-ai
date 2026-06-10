// Lazy quiz generation per course section (~300 tokens)
// Generated when user opens or completes a section, then cached.

import { validateAuth, unauthorized } from '../../../lib/auth'
import { checkRateLimit } from '../../../lib/ratelimit'
import { getSubscriptionTier } from '../../../lib/subscription'
import { callGeminiJSONWithUsage } from '../../../lib/providers/gemini'
import { buildSectionQuizPrompt, UserContext } from '../../../lib/prompts'
import { trackTokenUsage } from '../../../lib/tokenUsage'
import { supabase } from '../../../lib/supabase'

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

  // Fetch section + course
  const { data: section } = await supabase
    .from('course_sections')
    .select('id, title, quiz_generated, course_id, courses(title, user_id)')
    .eq('id', sectionId)
    .single()

  if (!section) {
    return new Response(JSON.stringify({ error: 'Section not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  const course = section.courses as any
  if (course?.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  // Return cached quiz if already generated
  if (section.quiz_generated) {
    const { data: cached } = await supabase
      .from('section_quizzes')
      .select('questions')
      .eq('section_id', sectionId)
      .single()

    if (cached) return Response.json({ questions: cached.questions, cached: true })
  }

  const { allowed } = await checkRateLimit(user.id, 'free')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Daily AI limit reached' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch content summary for better questions
  const { data: contentRow } = await supabase
    .from('section_content')
    .select('content')
    .eq('section_id', sectionId)
    .single()

  const contentSummary = contentRow?.content
    ? `${contentRow.content.overview} ${(contentRow.content.keyPoints ?? []).map((k: any) => k.point).join('. ')}`
    : undefined

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

  const prompt = buildSectionQuizPrompt({
    courseTitle:    course.title,
    sectionTitle:   section.title,
    sectionContent: contentSummary,
    ctx,
    count: 4,
  })

  const tier   = await getSubscriptionTier(user.id)
  const apiKey = tier === 'pro' ? process.env.GEMINI_PAID_API_KEY! : process.env.GEMINI_FREE_API_KEY!

  const { text, promptTokens, completionTokens, totalTokens } = await callGeminiJSONWithUsage(apiKey, prompt, 'gemini-flash-lite-latest', 600)
  const { questions } = JSON.parse(text)

  await Promise.all([
    supabase.from('section_quizzes').upsert({ section_id: sectionId, questions }, { onConflict: 'section_id' }),
    supabase.from('course_sections').update({ quiz_generated: true }).eq('id', sectionId),
    trackTokenUsage({ userId: user.id, promptTokens, completionTokens, totalTokens, endpoint: 'quiz-section' }),
  ])

  return Response.json({ questions, cached: false })
}
