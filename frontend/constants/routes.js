export const ROUTES = {
  // Auth
  LOGIN:        '/(auth)/login',
  REGISTER:     '/(auth)/register',
  ONBOARDING:   '/(auth)/onboarding',

  // Tabs
  HOME:         '/(tabs)',
  EXPLORE:      '/(tabs)/explore',
  MY_LEARNING:  '/(tabs)/my-learning',
  PROFILE:      '/(tabs)/profile',

  // Learning
  ROADMAP:      (id) => `/roadmap/${id}`,
  LESSON:       (nodeId) => `/lesson/${nodeId}`,
  QUIZ:         (nodeId) => `/quiz/${nodeId}`,

  // Subscription
  SUBSCRIPTION: '/subscription',

  // V2
  GENERATE:     '/generate',
  COMMUNITY:    (nodeId) => `/community/${nodeId}`,
  ANALYTICS:    '/analytics',
}
