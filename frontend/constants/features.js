export const FEATURES = {
  VOICE_INPUT:         process.env.EXPO_PUBLIC_VOICE_ENABLED === 'true',
  VOICE_OUTPUT:        process.env.EXPO_PUBLIC_VOICE_ENABLED === 'true',
  SRS:                 process.env.EXPO_PUBLIC_SRS_ENABLED === 'true',
  COMMUNITY:           process.env.EXPO_PUBLIC_COMMUNITY_ENABLED === 'true',
  ANALYTICS:           process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
  ROADMAP_GENERATION:  process.env.EXPO_PUBLIC_GENERATION_ENABLED === 'true',
  ADAPTIVE_DIFFICULTY: process.env.EXPO_PUBLIC_ADAPTIVE_ENABLED === 'true',
}
