# AI Learning Platform — Frontend Specification (V1 + V2)
> Stack: React Native + Expo + Gluestack UI v2 + NativeWind + Expo Router
> Target: iOS first → Android V2 (Expo Go dev, EAS Build + TestFlight distribution)
> Audience: Wide spectrum, multilingual, mobile-first
> Payments: Stripe via web browser only — no in-app purchase SDK (Apple 3.1.1 compliant)
> Theme: Merged palette — Ink Black dark base, Eggshell light base, Dusty Denim accent

---

## Feature Scope

### V1 — Core Learning Loop
| Feature | Description |
|---|---|
| Auth + Onboarding | Email/Google/Apple login, language select, goal capture, level detect |
| Roadmap Explorer | Browse curated roadmaps by category/difficulty |
| Roadmap Graph View | Custom SVG graph renderer, node states, tap interaction |
| Lesson Screen | Micro-learning format: concept + visual + code + exercise |
| AI Tutor Chat | Streaming, session-aware, lesson-contextual |
| Quiz / Assessment | MCQ + fill-in-blank + Feynman (AI-graded) per node |
| Progress Tracking | Node completion, roadmap progress, time spent |
| Streak System | Daily streak, XP bar, basic gamification |
| Free Tier Limits | 10 AI calls/day, rate limit UI |
| Subscription Screen | Upgrade CTA → opens Stripe web checkout |
| Profile + Settings | Language, theme, BYOK (OpenAI only), account |
| Offline — Read Only | Cache lessons, roadmap structure, last AI explanations |
| Multilingual | EN + HI + AR (RTL) from day 1 |
| Dark + Light Theme | System-aware, user-overridable |

### V2 — Depth + Personalization
| Feature | Description |
|---|---|
| AI Roadmap Generation | Paid feature — personalized roadmap from goal + constraints |
| Spaced Repetition (SRS) | SM-2 algorithm, daily review queue, notifications |
| Voice Input | Whisper API — speak questions to AI tutor |
| Voice Output | TTS — AI reads lesson + responses in user language |
| Adaptive Difficulty | Infer level from behavior, adjust content depth |
| Feynman Deep Mode | Multi-turn Feynman with AI gap analysis |
| Code Comments in Native Lang | AI translates code comments per user locale |
| Local Context Examples | AI uses culturally relevant examples per locale |
| Community Q&A per Node | Upvote-filtered, AI-summarized threads |
| BYOK Multi-Provider | Gemini + Claude + Azure in addition to OpenAI |
| Org / Team Plans | Shared roadmaps, team progress dashboards |
| Android Support | Full parity, Play Store |
| Web App | React Native Web for desktop learners |
| Roadmap Sharing | Share generated roadmaps publicly |
| Learning Analytics | Skill radar, time heatmap, weak area detection |
| Offline — Full | Offline AI explanations from cache, offline quiz |

---

## 1. Project Structure

```
/app
  /(auth)
    login.jsx
    register.jsx
    onboarding.jsx                ← V1: language + goal + level + time
  /(tabs)
    index.jsx                     ← Home / Dashboard
    explore.jsx                   ← Browse roadmaps
    my-learning.jsx               ← Active roadmaps + SRS queue (V2)
    profile.jsx                   ← Settings, subscription, BYOK
  /roadmap
    [id].jsx                      ← Graph view
  /lesson
    [nodeId].jsx                  ← Lesson + AI tutor
  /quiz
    [nodeId].jsx                  ← Assessment
  /subscription
    index.jsx                     ← Paywall
  /generate                       ← V2
    index.jsx                     ← Roadmap generation form
    result.jsx                    ← Generated roadmap preview
  /community                      ← V2
    [nodeId].jsx                  ← Node Q&A thread
  /analytics                      ← V2
    index.jsx                     ← Skill radar + learning stats
  _layout.jsx
  +not-found.jsx

/components
  /RoadmapGraph
    index.jsx
    useGraphLayout.js             ← Dagre layout hook
    GraphNode.jsx
    GraphEdge.jsx
    GraphCanvas.jsx               ← Pinch/pan gesture handler
    nodeTypes/
      ConceptNode.jsx
      ProjectNode.jsx
      AssessmentNode.jsx
      MilestoneNode.jsx
    constants.js                  ← NODE_WIDTH, STATUS_COLORS, NODE_TYPES
    GraphMinimap.jsx              ← V2: minimap overlay

  /AITutor
    TutorChat.jsx                 ← Bottom sheet chat
    MessageBubble.jsx
    StreamingText.jsx             ← Token-by-token render
    VoiceInput.jsx                ← V2: Whisper mic
    VoiceOutputButton.jsx         ← V2: TTS per message

  /Learning
    LessonCard.jsx
    MicroLesson.jsx               ← Concept + visual + code + exercise
    FeynmanPrompt.jsx             ← Teach-it-back input
    ProgressBar.jsx
    StreakBadge.jsx
    NodeStatusIcon.jsx
    CodeBlock.jsx                 ← Syntax highlighted + copy
    LocalizedCodeComment.jsx      ← V2: translated comments
    AdaptiveDifficultyBadge.jsx   ← V2: inferred level indicator

  /Quiz
    QuizQuestion.jsx
    MCQOption.jsx
    FillBlank.jsx
    FeynmanQuestion.jsx
    QuizResults.jsx

  /SRS                            ← V2
    ReviewCard.jsx
    ReviewQueue.jsx
    SRSProgress.jsx

  /Community                      ← V2
    QuestionThread.jsx
    AnswerItem.jsx
    AskQuestion.jsx

  /Common
    LanguageSelector.jsx
    SubscriptionGate.jsx          ← Wraps paid features with paywall
    OfflineBanner.jsx
    LoadingSkeleton.jsx
    ThemeToggle.jsx
    RateLimit Banner.jsx          ← Shows remaining AI calls

/hooks
  useTheme.js
  useAIStream.js                  ← Streaming fetch + SSE parser
  useRoadmapProgress.js
  useOfflineSync.js               ← Queue + flush on reconnect
  useRateLimit.js
  useSRS.js                       ← V2: SM-2 scheduler
  useAdaptiveDifficulty.js        ← V2: behavior-based level inference
  useVoice.js                     ← V2: Whisper + TTS

/store
  authStore.js
  learningStore.js
  roadmapStore.js
  settingsStore.js                ← theme, language, provider, BYOK tier
  srsStore.js                     ← V2

/locales
  en/
    common.json
    lessons.json
    errors.json
    onboarding.json
  hi/
    common.json
    lessons.json
    errors.json
    onboarding.json
  ar/                             ← RTL wired from day 1
    common.json
    lessons.json
    errors.json
    onboarding.json

/lib
  i18n.js
  supabase.js
  api.js                          ← Typed Vercel backend client
  secureStorage.js                ← Expo SecureStore wrapper for BYOK keys
  offline.js                      ← expo-sqlite cache layer
  subscription.js                 ← Stripe web redirect + status refresh

/constants
  theme.js                        ← COLORS, DARK_THEME, LIGHT_THEME, NODE_STATUS_COLORS
  routes.js
  providers.js                    ← AI provider configs + supported models

/assets
  fonts/
  images/
```

---

## 2. Dependencies

### V1 Install

```bash
# Core navigation
npx expo install expo-router

# UI system
npx expo install nativewind
npm install tailwindcss
npx expo install @gluestack-ui/themed @gluestack-style/react

# Graph renderer
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated
npx expo install react-native-svg
npm install dagre

# i18n + locale
npm install i18next react-i18next
npx expo install expo-localization

# Auth + database
npm install @supabase/supabase-js
npx expo install expo-secure-store
npx expo install @react-native-async-storage/async-storage

# Offline
npx expo install expo-sqlite
npx expo install expo-file-system
npx expo install @react-native-community/netinfo

# Subscriptions (web redirect only, no SDK)
npx expo install expo-linking

# State
npm install zustand

# Utils
npx expo install expo-haptics
npx expo install expo-notifications
npx expo install expo-updates           ← Required for RTL reload
```

### V2 Additional

```bash
# Voice
npx expo install expo-av
npx expo install expo-speech

# Analytics + charts (skill radar)
npm install react-native-gifted-charts

# Deep linking (roadmap share)
npx expo install expo-sharing
```

---

## 3. Screen Specifications

### 3.1 Onboarding (`/app/(auth)/onboarding.jsx`) — V1

5-step flow, no login wall until step 5.

```
Step 1 — Language selection
  Grid 3-col: flag emoji + language name + English name below
  Languages: EN, HI, AR, ES, FR, PT, DE, JA, ZH, KO
  RTL toggle fires immediately on AR/HE/UR select
  Selection stored to settingsStore instantly

Step 2 — Learning goal
  Heading: "What do you want to learn?"
  Suggestion chips (multi-select):
    Web Dev · Data Science · Mobile Dev · DevOps ·
    Machine Learning · Cybersecurity · UI/UX · Blockchain
  Free text input: "Or describe your own goal..."

Step 3 — Experience level
  4 cards (single select, NOT a slider):
    Complete Beginner — "I'm starting from scratch"
    Some Experience   — "I know the basics"
    Intermediate      — "I can build things"
    Advanced          — "I want to go deeper"

Step 4 — Daily commitment
  4 option cards:
    15 min · 30 min · 1 hour · 2+ hours

Step 5 — Account creation
  "Continue with Google" (Supabase OAuth)
  "Continue with Apple"  (Supabase OAuth)
  "Continue with Email"  → inline email + password fields
  "Skip for now" → guest mode (1 roadmap preview, no AI tutor)

Navigation: back arrow (steps 2–5), step dots, progress bar
```

**Key behaviors:**
- All strings via `t('onboarding.key')` — zero hardcoded English
- Language change on step 1 triggers `I18nManager.forceRTL()` + `Updates.reloadAsync()`
- Guest mode gates: AI tutor, progress save, SRS

---

### 3.2 Home / Dashboard (`/(tabs)/index.jsx`) — V1 + V2

**V1 sections (top to bottom):**

```
1. Header
   Left: "Good morning, {name}" (localized greeting)
   Right: notification bell (badge dot if SRS due — V2)

2. Streak + XP card (full width)
   Dark: #0D1321 → #1D2D44 gradient
   Light: rgba(116,140,171,0.12) tint over #F0EBD8
   "🔥 7 day streak"
   XP progress bar in #748CAB
   "450 / 500 XP to level up"

3. Continue Learning card
   Last active roadmap: title, category chip, progress bar
   "Next: {nodeTitle}" with node type icon
   "Continue" button → /roadmap/[id]

4. Recommended Roadmaps (horizontal scroll)
   3 cards: title, category, difficulty chip, estimated weeks
   Tapping → /roadmap/[id]

5. Recent Activity feed
   3 items with icons: completed node, review, milestone
```

**V2 additions:**
```
3b. SRS Review prompt (amber card, shown if queue > 0)
    "📚 {n} concepts need review today"
    "Start Review →" button

6. Skill Radar preview (collapsed card, tap to expand → /analytics)
   Shows top 3 strongest + weakest topic areas
```

---

### 3.3 Explore (`/(tabs)/explore.jsx`) — V1 + V2

**V1:**
```
Search bar (full width)
Filter chips (horizontal scroll):
  All · Programming · Data Science · Mobile · DevOps · Design · ML · Security

Roadmap card grid (2 columns):
  Top color band per category
  Title, difficulty chip, X weeks, Y nodes, enrolled count
  "Start" button

Featured card (full width, above grid):
  "Editor's Pick" tag
  More detail: description + stats

Empty state on search miss
```

**V2 additions:**
```
"AI Generate Your Roadmap" banner (pro users only)
  "Describe what you want to learn →" CTA → /generate
  Locked state with upgrade prompt for free users

Community trending section:
  "Popular this week" horizontal scroll
  Shows user-generated roadmaps (is_public = true)
```

---

### 3.4 Roadmap Graph View (`/roadmap/[id].jsx`) — V1 + V2

**V1:**
```
Top bar:
  Back arrow | Roadmap title | Progress % | Share icon

Full-screen zoomable/pannable graph:
  Custom RoadmapGraph component (dagre + SVG)
  Pinch zoom: 0.5x–2x
  Initial position: auto-center on current active node
  Long press node → quick menu: skip / bookmark

Bottom sheet (peek always visible, expands on node tap):
  Node title + type chip + estimated time
  Description (2 lines, expand on tap)
  Status badge
  "Start Lesson" → /lesson/[nodeId]
  "Preview" (locked nodes — shows what unlocks it)

FAB (bottom right):
  #748CAB circle, chat icon, #0D1321 icon color
  Opens TutorChat in roadmap context
```

**Node states:**
```
locked      → rgba(62,92,118,0.2) bg, #3E5C76 border, lock icon
available   → rgba(116,140,171,0.15) bg, #748CAB border, play icon
in_progress → rgba(234,179,8,0.12) bg, #eab308 border, pulsing ring
completed   → rgba(34,197,94,0.12) bg, #22c55e border, checkmark
```

**V2 additions:**
```
Minimap overlay (top-right corner, collapsible)
  Small-scale full graph with viewport indicator

Node unlock animation:
  Newly unlocked node: border pulse + brief scale-up

Edge draw animation:
  Completed node → edge animates to next available node

"Share this roadmap" → expo-sharing (generated roadmaps only)
```

---

### 3.5 Lesson Screen (`/lesson/[nodeId].jsx`) — V1 + V2

**V1 layout (strict — do not reorder blocks):**

```
Top bar:
  Back | Node title | "Node X of Y" | estimated time chip
  Voice readout button (speaker icon) — V2 only, placeholder in V1

Scrollable content:

Block 1 — CORE CONCEPT
  Label: "CORE CONCEPT" in #748CAB, uppercase, 11px
  2–3 sentence explanation (AI-generated, cached)

Block 2 — VISUAL
  SVG diagram or placeholder box (180px height)
  "Diagram" label centered if no SVG yet

Block 3 — CODE EXAMPLE
  Dark code block (#0D1321 bg, monospace)
  Language chip top-right
  Copy button top-right
  V1: English comments only
  V2: comments in user's language (AI-translated, cached)

Block 4 — TRY IT
  rgba(116,140,171,0.1) tinted card
  Exercise prompt
  Text input: "Type your answer..."

Block 5 — GO DEEPER (accordion, collapsed by default)
  Chevron row: "Go deeper ▼"
  Expands: additional context + links

Fixed bottom bar:
  "Ask AI 💬" (outlined, #748CAB border + text)
  "I understand this ✓" (filled, #748CAB bg, #0D1321 text)
  → tapping "I understand" triggers FeynmanPrompt before marking complete
```

**V2 additions:**
```
Voice readout button functional (expo-speech reads full lesson)
LocalizedCodeComment component renders comments in user locale
Adaptive difficulty badge on top bar: "Beginner / Intermediate / Advanced"
  — inferred from behavior, not self-reported
"Suggest better example" tap → AI generates locale-relevant example
```

---

### 3.6 AI Tutor Chat — V1 + V2

Rendered as bottom sheet over lesson or roadmap screen.
Component: `/components/AITutor/TutorChat.jsx`

**V1:**
```
Bottom sheet:
  Handle bar (visual, draggable)
  Two heights: half-screen default, full-screen on expand tap
  Header: "AI Tutor" | context chip "Lesson: {title}" | minimize button

Messages area (scrollable):
  AI bubbles: #1D2D44 bg (dark) / #FFFFFF (light), left-aligned
  User bubbles: #748CAB bg, #0D1321 text, right-aligned
  Typing animation bubble (3 dots)

StreamingText component renders AI tokens as they arrive

Input bar (fixed bottom):
  Mic button (placeholder in V1, functional in V2)
  Text input: "Ask anything about this lesson..."
  Send button (#748CAB)

Session context injection:
  Lesson node title + type + roadmap title sent in every request
  Full conversation history sent each turn (rolling window)
  Last 3 sessions summarized + injected for cross-session memory

Rate limit display:
  Below input: "5 AI conversations remaining today"
  Tapping → /subscription
```

**V2 additions:**
```
VoiceInput: tap mic → Whisper transcription → send as text
VoiceOutputButton on each AI bubble: TTS reads response in user language
Adaptive tone: if user sends >2 "I don't understand" in session
  → AI automatically simplifies + switches to local context example
Feynman trigger: after 3+ exchanges on same concept
  → AI offers "Want to test your understanding?" → opens FeynmanPrompt
```

---

### 3.7 Quiz / Assessment (`/quiz/[nodeId].jsx`) — V1 + V2

**V1:**
```
Header: back arrow | "Quiz: {nodeTitle}" | "Q{n} of 5" | progress bar

Question types:
  MCQ: 4 option cards
    Default: surface bg, border
    Selected: #748CAB bg, #0D1321 text
    Correct (post-submit): #22c55e tint + checkmark
    Wrong (post-submit): #ef4444 tint + X icon
  Fill in blank: text input, monospace font
  Feynman (Q5): multi-line input
    "Explain {concept} as if teaching a 12-year-old"
    AI evaluates → score 0–100 → pass if ≥70

After each question:
  Explanation card appears (light blue tint)
  "Next Question →" button

Results screen:
  Score: "4/5 Correct — 80%"
  Pass (≥80%): green badge "Passed ✓"
  Fail (<80%): amber badge "Try Again"
  Breakdown: which questions right/wrong
  "Continue →" (pass) | "Review Mistakes" → retry (different order)
  Pass → marks node complete, unlocks next nodes, creates SRS entry (V2)

"Ask AI about this question" link on every question
```

**V2 additions:**
```
Adaptive question difficulty:
  If user scored 100% → next quiz has harder variants
  If user scored <60% → easier variants + more explanation hints

Question bank growth:
  Each node accumulates questions over time
  Never shows same question twice in a row
```

---

### 3.8 Profile + Settings (`/(tabs)/profile.jsx`) — V1 + V2

**V1:**
```
Header: avatar (initials fallback) | display name | email | "Edit Profile"

Subscription card:
  Free: "10 AI conversations/day · {n} remaining"
  Pro: "Pro Plan — Unlimited AI"
  Upgrade CTA → Linking.openURL(STRIPE_CHECKOUT_URL)
  Note: "Manage subscription at yourapp.com"

AI Settings section:
  Current mode: "Platform AI" chip
  "Use my own API key" switch → BYOK panel:
    Provider select: OpenAI (V1 only) | + Gemini + Claude (V2)
    API key input (masked, show/hide toggle)
    Stored via expo-secure-store, never in Zustand
    "Your key is encrypted on this device only" note

Appearance:
  Theme toggle: Dark / Light / System
  Language selector → modal language picker
    Changing to RTL language triggers app reload

Notifications (V2):
  "Daily review reminder" toggle + time picker
  "Streak alert" toggle

Stats row (3 columns):
  Nodes completed | Current streak | Total hours

Account:
  "Sign out" (red)
  "Delete account" (red, smaller)
  App version text
```

**V2 additions:**
```
BYOK multi-provider (Gemini + Claude + Azure)
Notification preferences (SRS reminders, streak alerts)
Learning preferences:
  Preferred explanation style: "Conceptual / Visual / Example-first"
  Difficulty preference: "Auto-detect / Always challenge me / Ease into it"
Export learning data (JSON download)
```

---

### 3.9 Subscription Screen (`/subscription/index.jsx`) — V1

```
Header: back arrow | "Upgrade to Pro"

Hero card (#0D1321, #748CAB accent text):
  "Unlock your full learning potential"

Feature comparison:
  Free:
    ✓ All roadmaps
    ✓ 10 AI conversations/day
    ✓ Basic progress tracking
    ✗ Unlimited AI tutor
    ✗ Generate custom roadmaps (V2)
    ✗ Voice input + output (V2)
    ✗ Full offline mode (V2)
    ✗ Spaced repetition (V2)

  Pro:
    ✓ Everything in Free
    ✓ Unlimited AI conversations
    ✓ Generate custom roadmaps (V2)
    ✓ Voice input + output (V2)
    ✓ Full offline mode (V2)
    ✓ Spaced repetition (V2)
    ✓ Priority support

Pricing toggle: Monthly / Yearly (save 33%)
CTA: "Subscribe on our website →"
  Linking.openURL(STRIPE_CHECKOUT_URL)
  Never shows card input — web only

"🔒 Secure payment via Stripe · Cancel anytime"
```

---

### 3.10 Roadmap Generation (`/generate/`) — V2 ONLY

```
/generate/index.jsx — Generation form:
  Goal input (free text, large)
  Prior knowledge chips (multi-select)
  Weeks available (slider 2–24)
  Daily time (4 cards: 15min/30min/1hr/2hr+)
  Target language select (same as onboarding language selector)
  "Generate My Roadmap" button (pro only)
  Free users see locked state with upgrade CTA

/generate/result.jsx — Preview + confirm:
  Generated roadmap title + description
  Preview of first 5 nodes as a simplified list
  "Looks good — Start Learning" → enrolls + goes to /roadmap/[id]
  "Regenerate" → re-runs generation
  "Edit title/description" inline
```

---

### 3.11 Analytics (`/analytics/`) — V2 ONLY

```
Skill radar chart (react-native-gifted-charts polar)
  Topic areas as axes
  Strong = #22c55e, Weak = #eab308

Learning heatmap:
  GitHub-style calendar grid
  Days active shown in #748CAB intensity

Stats cards:
  Total nodes | Total hours | Avg quiz score | Longest streak

Weak areas list:
  "You struggled with: Recursion, Async/Await, CSS Grid"
  Each item: "Review now →" button

Time breakdown:
  Pie chart: Lessons vs Quiz vs AI Tutor vs Review
```

---

### 3.12 SRS Review (`/my-learning.jsx` + ReviewCard) — V2 ONLY

```
Review queue card on My Learning tab:
  "📚 {n} due today" amber chip
  "Start Review" button

ReviewCard component:
  Shows node title + category
  "How well did you remember this?"
  5-button rating: Again / Hard / Good / Easy / Perfect
  Maps to SM-2 quality score 0–5
  Next review date shown after rating

After all reviews:
  "All done for today 🎉" state
  Stats: reviewed count, avg ease, next session date
```

---

## 4. i18n + RTL Setup

```javascript
// lib/i18n.js
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import { I18nManager } from 'react-native'
import * as Updates from 'expo-updates'

const RTL_LANGUAGES = ['ar', 'he', 'ur', 'fa']

export function initI18n(savedLanguage) {
  const lang = savedLanguage || Localization.locale.split('-')[0]
  const isRTL = RTL_LANGUAGES.includes(lang)
  I18nManager.allowRTL(isRTL)
  I18nManager.forceRTL(isRTL)
  i18n.use(initReactI18next).init({
    resources: {
      en: { common: require('../locales/en/common.json') },
      hi: { common: require('../locales/hi/common.json') },
      ar: { common: require('../locales/ar/common.json') },
    },
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
}

// Call after language change in settings
export async function changeLanguage(lang) {
  await i18n.changeLanguage(lang)
  const isRTL = RTL_LANGUAGES.includes(lang)
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL)
    await Updates.reloadAsync()  // Required for RTL layout to apply
  }
}
```

---

## 5. Zustand Store Structure

```javascript
// store/settingsStore.js
{
  language: 'en',
  isRTL: false,
  theme: 'dark',               // 'dark' | 'light' | 'system'
  aiProvider: 'platform',      // 'platform' | 'openai' | 'gemini' | 'claude'
  byokKey: null,               // from SecureStore only — never stored in Zustand
  subscriptionTier: 'free',    // 'free' | 'pro'
  dailyCallsUsed: 0,
  dailyCallsLimit: 10,
  // V2
  preferredExplanationStyle: 'auto',   // 'conceptual' | 'visual' | 'example-first'
  difficultyPreference: 'auto',
}

// store/learningStore.js
{
  activeRoadmaps: [],
  currentRoadmapId: null,
  currentNodeId: null,
  streak: { current: 0, longest: 0, lastActiveDate: null },
  totalMinutes: 0,
  // V2
  srsQueue: [],               // nodes due for review today
  inferredLevel: 'beginner',  // updated by adaptive difficulty hook
}

// store/authStore.js
{
  user: null,               // Supabase user object
  session: null,
  isGuest: false,
  profile: null,            // profiles table row
}

// store/roadmapStore.js
{
  roadmaps: {},             // keyed by id
  userRoadmaps: {},         // keyed by roadmap_id, includes progress
  currentRoadmap: null,
}
```

---

## 6. Custom Graph Renderer

**Dependencies:** `dagre` + `react-native-svg` + `react-native-gesture-handler` + `react-native-reanimated`

```javascript
// components/RoadmapGraph/constants.js
export const NODE_WIDTH = 160
export const NODE_HEIGHT = 80

export const STATUS_COLORS = {
  completed:   { bg: 'rgba(34,197,94,0.12)',    border: '#22c55e',  text: '#22c55e'  },
  available:   { bg: 'rgba(116,140,171,0.15)',  border: '#748CAB',  text: '#748CAB'  },
  in_progress: { bg: 'rgba(234,179,8,0.12)',    border: '#eab308',  text: '#eab308'  },
  locked:      { bg: 'rgba(62,92,118,0.2)',     border: '#3E5C76',  text: '#3E5C76'  },
}

export const NODE_TYPES = {
  concept:    { icon: '📖', label: 'Concept'   },
  project:    { icon: '🛠',  label: 'Project'  },
  assessment: { icon: '✅',  label: 'Quiz'     },
  milestone:  { icon: '🏆',  label: 'Milestone'},
}
```

**V1 scope:** dagre layout, node + edge render, tap interaction, pinch/pan
**V2 scope:** node unlock animation, edge draw animation, minimap overlay

Full implementation reference: see `/components/RoadmapGraph/` — useGraphLayout (dagre hook), GraphCanvas (gesture handler), GraphNode (SVG rect + text), GraphEdge (SVG path with arrowhead marker).

---

## 7. Subscription Flow (Stripe Web-Only)

```javascript
// lib/subscription.js
import * as Linking from 'expo-linking'
import { supabase } from './supabase'

export async function openUpgradeFlow(userId, plan = 'monthly') {
  const url = `${process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL}?userId=${userId}&plan=${plan}`
  await Linking.openURL(url)
}

export async function refreshSubscriptionStatus(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()
  return data?.subscription_tier || 'free'
}
```

```javascript
// _layout.jsx — poll on foreground return
import { AppState } from 'react-native'

useEffect(() => {
  const sub = AppState.addEventListener('change', async (state) => {
    if (state === 'active' && user?.id) {
      const tier = await refreshSubscriptionStatus(user.id)
      settingsStore.setSubscriptionTier(tier)
    }
  })
  return () => sub.remove()
}, [user])
```

---

## 8. Offline Architecture

```javascript
// lib/offline.js
const CACHE_KEYS = {
  roadmap:       (id)           => `roadmap_${id}`,
  lesson:        (nodeId, lang) => `lesson_${nodeId}_${lang}`,
  quiz:          (nodeId)       => `quiz_${nodeId}`,
  aiExplanation: (nodeId, lang) => `ai_${nodeId}_${lang}`,
  tutorSession:  (nodeId)       => `tutor_${nodeId}`,  // last 5 exchanges
}

// Proactive cache on lesson open
async function preCacheNode(nodeId, language) {
  await Promise.all([
    cacheLesson(nodeId, language),
    cacheQuiz(nodeId),
    cacheAIExplanations(nodeId, language),
  ])
}

// Sync queue — flushed on reconnect
const syncQueue = {
  progressUpdates: [],
  quizResults: [],
  tutorMessages: [],
}
```

**V1 offline scope:** read-only (lessons, roadmap structure, last AI explanations)
**V2 offline scope:** full quiz, cached AI responses, SRS reviews queue

**Rule:** Every screen must render cached content when offline. No blank screens, no infinite spinners.

---

## 9. AI Streaming Component

```javascript
// components/AITutor/StreamingText.jsx
export function StreamingText({ stream, style }) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!stream) return
    setText('')
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    async function read() {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.replace('data: ', '')
          if (data === '[DONE]') return
          try {
            const token = JSON.parse(data).choices?.[0]?.delta?.content || ''
            setText(prev => prev + token)
          } catch {}
        }
      }
    }
    read()
  }, [stream])

  return <Text style={style}>{text}</Text>
}
```

---

## 10. Environment Variables

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE_URL=              ← Vercel backend URL
EXPO_PUBLIC_STRIPE_CHECKOUT_URL=       ← yourapp.com/subscribe

# V2 additions
EXPO_PUBLIC_COMMUNITY_ENABLED=false    ← Feature flag, flip to true in V2
EXPO_PUBLIC_VOICE_ENABLED=false
EXPO_PUBLIC_ANALYTICS_ENABLED=false
```

---

## 11. Theme Constants (`/constants/theme.js`)

```javascript
export const COLORS = {
  inkBlack:         '#0D1321',   // darkest bg
  deepSpaceBlue:    '#1D2D44',   // dark surface
  blueSlate:        '#3E5C76',   // muted / borders
  dustyDenim:       '#748CAB',   // primary accent — both themes
  eggshell:         '#F0EBD8',   // light theme bg + dark primary text
  accentHoverDark:  '#8FA5BF',   // hover on dark bg
  accentHoverLight: '#5A7A9A',   // hover on light bg
  midNavy:          '#2A3A5C',   // elevated surface dark
  warmWhite:        '#F7F4EE',   // light elevated surface
  success:          '#22c55e',
  warning:          '#eab308',
  error:            '#ef4444',
}

export const DARK_THEME = {
  background:    '#0D1321',
  surface:       '#1D2D44',
  elevated:      '#2A3A5C',
  border:        'rgba(62, 92, 118, 0.5)',
  borderStrong:  '#3E5C76',
  accent:        '#748CAB',
  accentHover:   '#8FA5BF',
  accentText:    '#0D1321',              // text ON accent — NEVER white
  textPrimary:   '#F0EBD8',             // eggshell on dark
  textSecondary: 'rgba(240,235,216,0.6)',
  textMuted:     'rgba(240,235,216,0.35)',
  overlay:       'rgba(13,19,33,0.85)',
}

export const LIGHT_THEME = {
  background:    '#F0EBD8',
  surface:       '#FFFFFF',
  elevated:      '#F7F4EE',
  border:        'rgba(62, 92, 118, 0.18)',
  borderStrong:  'rgba(62, 92, 118, 0.35)',
  accent:        '#748CAB',
  accentHover:   '#5A7A9A',
  accentText:    '#0D1321',
  textPrimary:   '#0D1321',
  textSecondary: '#3E5C76',
  textMuted:     'rgba(13,19,33,0.4)',
  overlay:       'rgba(13,19,33,0.6)',
}

export const NODE_STATUS_COLORS = {
  completed:   { bg: 'rgba(34,197,94,0.12)',   border: '#22c55e', text: '#22c55e' },
  available:   { bg: 'rgba(116,140,171,0.15)', border: '#748CAB', text: '#748CAB' },
  in_progress: { bg: 'rgba(234,179,8,0.12)',   border: '#eab308', text: '#eab308' },
  locked:      { bg: 'rgba(62,92,118,0.2)',    border: '#3E5C76', text: '#3E5C76' },
}

// NativeWind quick ref
// bg-[#0D1321]  bg-[#1D2D44]  bg-[#F0EBD8]  bg-[#748CAB]
// text-[#F0EBD8] (dark) | text-[#0D1321] (light)
// text-[#748CAB] (accent label)
// border-[#3E5C76]/50
// bg-[#748CAB] text-[#0D1321]  ← filled button
// border border-[#748CAB] text-[#748CAB] bg-transparent  ← outlined button
```

```javascript
// hooks/useTheme.js
import { useColorScheme } from 'react-native'
import { useSettingsStore } from '../store/settingsStore'
import { DARK_THEME, LIGHT_THEME } from '../constants/theme'

export function useTheme() {
  const { theme } = useSettingsStore()
  const system = useColorScheme()
  const resolved = theme === 'system' ? system : theme
  return resolved === 'dark' ? DARK_THEME : LIGHT_THEME
}
```

### Critical Contrast Rules
```
#F0EBD8 on #0D1321  → 14.2:1  ✓ primary text on dark
#0D1321 on #F0EBD8  → 14.2:1  ✓ primary text on light
#748CAB on #0D1321  →  3.8:1  ✗ fails WCAG AA for body text
#748CAB on #0D1321  →  3.8:1  ✓ passes for UI components + large text (18px+)
#0D1321 on #748CAB  →  3.8:1  ✓ passes for bold button labels (14px+)

Rules:
- #748CAB: borders, icons, progress fills, chips, large headings only
- Never use #748CAB for body text or labels under 14px bold
- All filled buttons: bg-[#748CAB] text-[#0D1321] font-bold text-[14px]+
- SRS/review prompt: warning amber (#eab308) — not brand colors, unchanged
- Success/error: #22c55e / #ef4444 — semantic only, not brand colors
```

---

## 12. V1 → V2 Feature Flag Pattern

```javascript
// constants/features.js
export const FEATURES = {
  VOICE_INPUT:        process.env.EXPO_PUBLIC_VOICE_ENABLED === 'true',
  VOICE_OUTPUT:       process.env.EXPO_PUBLIC_VOICE_ENABLED === 'true',
  SRS:                process.env.EXPO_PUBLIC_SRS_ENABLED === 'true',
  COMMUNITY:          process.env.EXPO_PUBLIC_COMMUNITY_ENABLED === 'true',
  ANALYTICS:          process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
  ROADMAP_GENERATION: process.env.EXPO_PUBLIC_GENERATION_ENABLED === 'true',
  ADAPTIVE_DIFFICULTY:process.env.EXPO_PUBLIC_ADAPTIVE_ENABLED === 'true',
}

// Usage: gate V2 UI behind feature flags
// {FEATURES.VOICE_INPUT && <VoiceInput />}
// {FEATURES.SRS && <SRSReviewBanner queue={srsQueue} />}
```

This means V2 components can be built and merged without shipping to users — flip the env var to enable. No separate branches needed.

