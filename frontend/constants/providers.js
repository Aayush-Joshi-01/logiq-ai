// Platform AI uses Gemini internally — never disclosed to users.
// BYOK allows users to supply their own key for any listed provider.
export const AI_PROVIDERS = {
  platform: { name: 'Platform AI', v2: false, byokOnly: false },
  openai:   { name: 'OpenAI',      v2: false, byokOnly: true,  models: ['gpt-4o-mini', 'gpt-4o'] },
  gemini:   { name: 'Gemini',      v2: true,  byokOnly: true,  models: ['gemini-flash-lite-latest'] },
  claude:   { name: 'Claude',      v2: true,  byokOnly: true,  models: ['claude-haiku-4-5-20251001'] },
  azure:    { name: 'Azure OpenAI',v2: true,  byokOnly: true,  models: ['gpt-4o'] },
}

// Secure store keys for BYOK (one per provider)
export const BYOK_STORE_KEYS = {
  openai: 'logiq_byok_openai',
  gemini: 'logiq_byok_gemini',
  claude: 'logiq_byok_claude',
  azure:  'logiq_byok_azure',
}
