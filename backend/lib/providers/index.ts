import { streamGemini } from './gemini'
import { streamOpenAI } from './openai'
import { streamClaude } from './claude'
import { streamAzure } from './azure'
import { getSubscriptionTier } from '../subscription'

// Platform AI always uses Gemini — the underlying provider is never exposed.
// BYOK routes to the user's chosen provider with their own key.
export async function streamFromProvider({
  provider,
  apiKey,
  messages,
  userId,
}: {
  provider: string
  apiKey: string | null
  messages: any[]
  userId?: string
}) {
  // BYOK path: user-supplied key, user-chosen provider
  if (apiKey) {
    switch (provider) {
      case 'openai':  return streamOpenAI(apiKey, messages)
      case 'gemini':  return streamGemini(apiKey, messages)
      case 'claude':  return streamClaude(apiKey, messages)
      case 'azure':   return streamAzure(apiKey, messages)
    }
  }

  // Platform path: always Gemini, key chosen by tier
  const tier = userId ? await getSubscriptionTier(userId) : 'free'
  const platformKey = tier === 'pro'
    ? process.env.GEMINI_PAID_API_KEY!
    : process.env.GEMINI_FREE_API_KEY!

  return streamGemini(platformKey, messages)
}
