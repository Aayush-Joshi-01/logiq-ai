// Edge runtime — streaming AI proxy with rate limiting and BYOK support
export const config = { runtime: 'edge' }

import { validateAuth, unauthorized } from '../../lib/auth'
import { getSubscriptionTier } from '../../lib/subscription'
import { checkRateLimit } from '../../lib/ratelimit'
import { streamFromProvider } from '../../lib/providers'
import { buildTutorPrompt } from '../../lib/prompts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user, error } = await validateAuth(req)
  if (!user) return unauthorized()

  const { messages, provider, nodeId, roadmapContext } = await req.json()

  const tier = await getSubscriptionTier(user.id)
  const { allowed, remaining } = await checkRateLimit(user.id, tier)

  if (!allowed) {
    return new Response(JSON.stringify({
      error:      'Daily AI limit reached',
      remaining:  0,
      upgradeUrl: '/subscription',
    }), {
      status:  429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // BYOK: user-supplied key takes precedence over platform key
  const byokKey = req.headers.get('X-BYOK-Key') || null

  const systemPrompt = buildTutorPrompt({
    nodeId,
    roadmapContext,
    userLanguage: req.headers.get('X-User-Language') || 'en',
    userLevel:    req.headers.get('X-User-Level')    || 'beginner',
  })

  const stream = await streamFromProvider({
    provider: provider || 'platform',
    apiKey:   byokKey,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    userId:   user.id,
  })

  return new Response(stream, {
    headers: {
      'Content-Type':          'text/event-stream',
      'X-RateLimit-Remaining': remaining.toString(),
      'Cache-Control':         'no-cache',
    },
  })
}
