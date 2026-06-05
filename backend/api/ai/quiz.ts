import { validateAuth, unauthorized } from '../../lib/auth'
import { getCached, setCached } from '../../lib/cache'
import { getSubscriptionTier } from '../../lib/subscription'
import { callGeminiJSON } from '../../lib/providers/gemini'
import { buildQuizPrompt } from '../../lib/prompts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const { nodeId, nodeTitle, nodeContent, language, difficulty = 'beginner', count = 5 } = await req.json()
  const cacheKey = `quiz:${nodeId}:${language}:${difficulty}`

  const cached = await getCached(cacheKey)
  if (cached) {
    return Response.json({ questions: JSON.parse(cached), cached: true })
  }

  const prompt = buildQuizPrompt({ nodeTitle, nodeContent, language, difficulty, count })
  const tier   = await getSubscriptionTier(user.id)
  const apiKey = tier === 'pro'
    ? process.env.GEMINI_PAID_API_KEY!
    : process.env.GEMINI_FREE_API_KEY!

  const raw  = await callGeminiJSON(apiKey, prompt)
  const data = JSON.parse(raw)

  await setCached(cacheKey, JSON.stringify(data.questions), 'platform', 7)

  return Response.json({ questions: data.questions, cached: false })
}
