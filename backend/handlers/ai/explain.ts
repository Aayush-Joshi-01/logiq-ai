import { validateAuth, unauthorized } from '../../lib/auth'
import { getCached, setCached } from '../../lib/cache'
import { getSubscriptionTier } from '../../lib/subscription'
import { callGeminiJSON } from '../../lib/providers/gemini'
import { buildExplainPrompt } from '../../lib/prompts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const { nodeId, nodeTitle, nodeType, language } = await req.json()
  const userLevel = req.headers.get('X-User-Level') || 'beginner'
  const cacheKey  = `explain:${nodeId}:${language}:lesson`

  // Cache check first — target 60%+ hit rate
  const cached = await getCached(cacheKey)
  if (cached) {
    return Response.json({ content: JSON.parse(cached), cached: true })
  }

  const prompt = buildExplainPrompt({ nodeTitle, nodeType, language, userLevel })
  const tier   = await getSubscriptionTier(user.id)
  const apiKey = tier === 'pro'
    ? process.env.GEMINI_PAID_API_KEY!
    : process.env.GEMINI_FREE_API_KEY!

  const raw = await callGeminiJSON(apiKey, prompt)
  const content = JSON.parse(raw)

  await setCached(cacheKey, JSON.stringify(content), 'platform', 30)

  return Response.json({ content, cached: false })
}
