import { validateAuth, unauthorized } from '../../lib/auth'
import { getSubscriptionTier } from '../../lib/subscription'
import { callGeminiJSON } from '../../lib/providers/gemini'
import { buildFeynmanPrompt } from '../../lib/prompts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const { explanation, concept, language } = await req.json()

  const prompt = buildFeynmanPrompt({ concept, language })
  const tier   = await getSubscriptionTier(user.id)
  const apiKey = tier === 'pro'
    ? process.env.GEMINI_PAID_API_KEY!
    : process.env.GEMINI_FREE_API_KEY!

  // Full prompt includes student explanation appended
  const fullPrompt = `${prompt}\n\nStudent explanation: "${explanation}"`
  const raw  = await callGeminiJSON(apiKey, fullPrompt)
  const result = JSON.parse(raw)

  return Response.json(result)
}
