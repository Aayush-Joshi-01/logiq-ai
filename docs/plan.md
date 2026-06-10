# Learnly-AI — Implementation Plan

## Context
Learnly-AI is an AI-powered mobile learning platform. The repo contains two detailed spec docs (`docs/frontend-spec.md`, `docs/backend-spec.md`) but no code yet. This plan defines what to build, in what order, and the critical decisions for each phase.

**Stack:**
- Frontend: React Native + Expo + Expo Router + Gluestack UI v2 + NativeWind + Zustand
- Backend: Vercel (Edge + Serverless) + Supabase (Auth + Postgres) + Upstash Redis + Gemini
- Payments: Stripe web-only (no in-app purchase SDK — Apple 3.1.1 compliant)
- i18n: EN + HI + AR (RTL from day 1)

**Platform AI model policy:**
- Free users: platform Gemini API key (free quota, `gemini-2.0-flash`)
- Pro users: platform Gemini API key (paid quota, `gemini-2.0-flash` with higher limits or `gemini-2.0-pro`)
- The underlying model is **never disclosed to users** — it shows only as "AI Tutor" in the UI
- BYOK users: supply their own key for any provider (OpenAI, Claude, Gemini, Azure) — their key, their cost, their model choice
- OpenAI, Claude, Azure are NOT used for the platform's own AI service — only available as BYOK options

---

## Build Order

```
Phase 0 — Scaffolding + Schema
    ├─► Phase 1 — Backend V1  ─────────┐  (parallel)
    └─► Phase 2 — Frontend Foundation ─┘
                    │
                    ▼
             Phase 3 — Core Learning Loop
                    │
                    ▼
             Phase 4 — Subscription + Profile
                    │
                    ▼
             Phase 5 — Offline + Polish
                    │
             Phase 6 — Backend V2  (can start parallel with Phase 5)
                    │
             Phase 7 — Frontend V2
```

---

## Phase 0 — Project Scaffolding

**Creates:** monorepo structure, env files, Supabase schema

### Frontend bootstrap
```
frontend/
  package.json, app.json, babel.config.js, tailwind.config.js
  tsconfig.json, metro.config.js, .env.example
```
- Bootstrap with `create-expo-app --template blank-typescript` then layer spec structure
- `"scheme": "learnlyai"` in `app.json` — required for Stripe deep-link return
- `babel.config.js`: `"nativewind/babel"` AFTER expo preset (wrong order silently drops all classes)
- V1 deps in one install to avoid peer-dep churn

### Backend bootstrap
```
backend/
  package.json, tsconfig.json, vercel.json, .env.example
```
- Vercel: set Root Directory = `backend` in dashboard
- `moduleResolution: "bundler"` in tsconfig — `node16` breaks Vercel's bundler
- CORS headers must list `X-BYOK-Key`, `X-User-Language`, `X-User-Level` explicitly

### Supabase schema
```
docs/schema.sql          ← All 11 tables from backend-spec §3
docs/rls-policies.sql    ← RLS policies (separated for auditability)
docs/seed.sql            ← 3 curated roadmaps with well-formed nodes+edges JSONB
```
- Add trigger: auto-create `profiles` + `streaks` rows on `auth.users` insert (prevents "profile not found" on first login)
- Seed `nodes` JSONB must match exact shape: `[{"id":"n1","title":"...","type":"concept","estimated_minutes":20,"week":1}]`
- Enable Google + Apple OAuth; redirect URL: `https://<vercel-domain>/api/auth/callback`

**Verify:** `npx expo start` shows dark `#0D1321` background. `vercel dev` → `GET /api/roadmap` returns `[]`. Supabase has 11 tables with RLS shield icons.

---

## Phase 1 — Backend V1

**Creates:** all V1 endpoints, middleware, provider router

### Lib layer (`backend/lib/`)
- `supabase.ts` — admin client (SERVICE_ROLE_KEY, server-side only)
- `redis.ts` — `Redis.fromEnv()` singleton
- `ratelimit.ts` — sliding window: free=10/24h, pro=500/24h
- `auth.ts` — `validateAuth(req)` → extracts Bearer, calls `supabase.auth.getUser`
- `cache.ts` — `getCached(key)` / `setCached(key, content, provider, ttlDays)`
- `prompts.ts` — `buildTutorPrompt`, `buildFeynmanPrompt`, `buildQuizPrompt` (exact implementations from backend-spec §7)
- `providers/gemini.ts` — `streamGemini` — used for ALL platform AI calls (free + pro tiers); free uses `GEMINI_FREE_API_KEY`, pro uses `GEMINI_PAID_API_KEY`; output normalized to OpenAI SSE format
- `providers/openai.ts` — BYOK only (user-supplied key forwarded)
- `providers/claude.ts` — BYOK only (user-supplied key forwarded, V2)
- `providers/azure.ts` — BYOK only (user-supplied key forwarded, V2)
- `providers/index.ts` — `streamFromProvider` router

**Model selection logic:**
```typescript
// No BYOK key → use platform Gemini (tier determines which API key)
// BYOK key present → route to user's chosen provider (openai/gemini/claude/azure)
// Never expose which model/provider is used in any API response
```

**Env vars:**
```bash
GEMINI_FREE_API_KEY=     ← Platform free-tier Gemini key
GEMINI_PAID_API_KEY=     ← Platform pro-tier Gemini key (higher quota)
# BYOK forwarding (V2, user-supplied keys only — no platform usage)
# OpenAI/Claude/Azure keys are NEVER stored in backend env
```

**Critical:** Do NOT instantiate `Ratelimit` at module level in Edge functions — causes cold-start memory issues.

### Middleware (`backend/middleware/`)
- `withAuth.ts`, `withRateLimit.ts`, `withSubscription.ts`
- Create shared `unauthorized()` helper with CORS headers pre-set

### AI endpoints (`backend/api/ai/`)
- `stream.ts` [Edge] — `export const config = { runtime: 'edge' }` at file top; include `X-RateLimit-Remaining` header on every response; resolve BYOK from `X-BYOK-Key` header; if no BYOK → use platform Gemini key based on tier
- `explain.ts` — cache check FIRST; 30-day Supabase cache; cache key: `explain:{nodeId}:{language}:{type}`; use platform Gemini for generation
- `quiz.ts` — 7-day cache; structured JSON output (Gemini `responseMimeType: "application/json"`)
- `feynman.ts` — structured JSON output via Gemini `responseMimeType: "application/json"`

**Provider field in `ai_cache` table:** store as `"platform"` (not `"gemini"`) — never leak the underlying model to any stored or returned data.

### Progress endpoints (`backend/api/progress/`)
- `node.ts` — mark complete, `unlockNextNodes` algorithm (check ALL incoming edges completed), update streak, seed SRS entry (no-op if flag off)
- `index.ts` — aggregated progress
- `streak.ts` — compare `last_active_date` in UTC; XP: 50 for concept/project, 100 for assessment/milestone

**`unlockNextNodes` algorithm:** node unlocks only when ALL its parent nodes (all incoming edges sources) are completed. Fully in-process using roadmap JSONB edges — no extra DB queries.

### Roadmap endpoints (`backend/api/roadmap/`)
- `[id].ts` — fetch roadmap + user_roadmaps in `Promise.all`; merge: annotate each node with `progress[node.id]?.status || 'locked'`; first node of every roadmap defaults to `'available'`

### Subscription endpoints (`backend/api/subscription/`)
- `checkout.ts` — returns `{ url }` for `Linking.openURL` (never redirect from API)
- `webhook.ts` — `await req.text()` BEFORE `stripe.webhooks.constructEvent` (Vercel body parser corrupts raw body); handle 4 events; bust Redis tier cache on upgrade/downgrade
- `status.ts` — tier + remaining calls

### Auth endpoints (`backend/api/auth/`)
- `callback.ts` — Supabase OAuth redirect → `learnlyai://auth/callback?token=...`
- `user.ts` — PATCH blocklist: never allow writing `subscription_tier`, `stripe_customer_id`, `inferred_level` from client

**Verify:** explain endpoint returns `cached: false` first call, `cached: true` second call. 11th free-user call → 429. Missing JWT → 401.

---

## Phase 2 — Frontend Foundation

**Creates:** app shell, navigation, theme, i18n (RTL), stores, auth + onboarding

### Full directory skeleton
All files from frontend-spec §1 as stubs, fleshed out in later phases.

### Theme + constants
- `constants/theme.js` — exact `COLORS`, `DARK_THEME`, `LIGHT_THEME`, `NODE_STATUS_COLORS` from spec §11
- `constants/features.js` — `FEATURES.*` from env vars (spec §12)
- `constants/routes.js` — typed route constants (`ROUTES.ROADMAP(id)` etc.)

**Contrast rules (enforce as code comments):** `#748CAB` valid only for elements ≥18px or bold ≥14px. Never for body text.

### Zustand stores
- `settingsStore.js` — persisted via AsyncStorage; `byokKey` always `null` (actual key in SecureStore)
- `authStore.js` — NOT persisted; initialized from `supabase.auth.getSession()` on startup
- `learningStore.js` — persisted via AsyncStorage
- `roadmapStore.js` — session-only (no persist)

### i18n (`lib/i18n.js`)
- Exact implementation from spec §4
- `initI18n(savedLanguage)` called **synchronously** in `_layout.jsx` BEFORE first render (calling after → flash of English)
- RTL testing requires EAS dev build — `Updates.reloadAsync()` does NOT work in Expo Go

### Clients
- `lib/supabase.js` — `createClient` with `AsyncStorage` storage, `autoRefreshToken: true`
- `lib/api.js` — auto-injects `Authorization`, `X-User-Language`, `X-User-Level`; reads `X-RateLimit-Remaining` from every response → updates `settingsStore`

### Root layout (`app/_layout.jsx`)
1. Load persisted language + theme from settingsStore
2. `initI18n(savedLanguage)` — synchronous, before render
3. Supabase auth listener → update authStore
4. `AppState 'active'` listener → `refreshSubscriptionStatus` → update settingsStore
5. `Linking` listener for `learnlyai://auth/callback`
6. Redirect: no session → onboarding | session → tabs

### Onboarding (`app/(auth)/onboarding.jsx`)
5-step wizard per spec §3.1:
- Step 1: language grid → AR select triggers `I18nManager.forceRTL(true)` + `Updates.reloadAsync()`
- Step 5: Google/Apple OAuth + email + "Skip for now" (guest mode)
- Save to `profiles` only on Step 5 completion (not earlier — user might abandon)
- Guest mode gates: AI tutor, progress save, SRS

**Verify:** 5-step onboarding works. Theme toggle switches immediately. Tab bar active icon is `#748CAB`. AR select on EAS dev build → RTL layout.

---

## Phase 3 — Core Learning Loop

**Creates:** roadmap graph, lesson, AI tutor, quiz — the entire MVP value loop

### RoadmapGraph (`components/RoadmapGraph/`)
Key files: `useGraphLayout.js`, `GraphNode.jsx`, `GraphEdge.jsx`, `GraphCanvas.jsx`, `constants.js`

**`useGraphLayout.js`** — dagre integration wrapped in `useMemo`:
- `rankdir: 'TB'`, `nodesep: 40`, `ranksep: 60`
- Output: nodes with `{x, y}` positioned (subtract NODE_WIDTH/2, NODE_HEIGHT/2), edges with `points` array

**`GraphCanvas.jsx`** — pinch + pan:
- `PinchGestureHandler` wrapping `PanGestureHandler` wrapping `Svg`
- Clamp scale 0.5x–2.0x
- `simultaneousHandlers` prop — **non-negotiable**; without it only one gesture fires
- SVG size = full dagre bounding box; the `Svg` element transforms, not viewport
- Auto-center on first `in_progress` node on mount

**`GraphNode.jsx`:**
- `in_progress`: pulsing ring via react-native-reanimated
- Status colors from `NODE_STATUS_COLORS` constants

**`GraphEdge.jsx`:**
- Bezier path from dagre `points` array (not straight lines)
- SVG `marker` defs for arrowhead

**`app/roadmap/[id].jsx`:** bottom sheet (120px peek, expands on node tap), FAB for TutorChat, long-press node → skip/bookmark.

**Critical:** Dagre is CommonJS → if Metro throws, add `resolver.unstable_enablePackageExports: false` to `metro.config.js`.

### Lesson screen (`app/lesson/[nodeId].jsx`)
5 blocks in strict order (spec §3.5 — do not reorder):
1. CORE CONCEPT — `#748CAB` label, uppercase 11px
2. VISUAL — SVG or 180px placeholder
3. CODE EXAMPLE — `CodeBlock` (dark bg always `#0D1321`, copy + haptics)
4. TRY IT — `rgba(116,140,171,0.1)` tinted card
5. GO DEEPER — collapsed accordion

Bottom bar: "Ask AI 💬" (outlined) + "I understand this ✓" (filled, triggers FeynmanPrompt).
On mount: `offline.preCacheNode(nodeId, language)` — fire-and-forget.

### AI Tutor (`components/AITutor/`, `hooks/useAIStream.js`)
- Do NOT use `EventSource` — React Native / Hermes doesn't have it. Use `fetch` + `ReadableStream` reader.
- `StreamingText.jsx` — exact implementation from spec §9
- BYOK key: always read fresh from SecureStore per `sendMessage` call (~2ms — acceptable)
- On 429: show non-dismissible `RateLimitBanner`, disable send button until reset
- `X-RateLimit-Remaining` header read from every stream response → update settingsStore without extra round-trip

### Quiz screen (`app/quiz/[nodeId].jsx`)
- MCQ: select → show correct/wrong simultaneously for 1.5s → explanation card (no "Next" button during delay)
- Feynman always Q5; AI-graded via `POST /api/ai/feynman`
- Pass (≥80%) → `PATCH /api/progress/node` → navigate to roadmap with `unlockedNodes` list for animation
- Fail → shuffle questions, Q5 always last

**Verify:** node tap → lesson loads with AI explanation. "Ask AI" → tokens stream in real-time. Quiz pass → node turns green on graph, adjacent node turns blue. Rate limit banner appears at ≤3 remaining.

---

## Phase 4 — Subscription + Profile

**Creates:** Stripe web-redirect flow, profile settings, BYOK storage

### Subscription screen (`app/subscription/index.jsx`)
- Feature comparison table per spec §3.9
- CTA: `Linking.openURL(STRIPE_CHECKOUT_URL?userId=...&plan=...)` — never shows card input
- `SubscriptionGate` component wraps paid features with paywall overlay

### Profile screen (`app/(tabs)/profile.jsx`)
- BYOK: masked input → `SecureStore.setItemAsync('learnly_byok_openai', key)` — never in Zustand
- Sign out: clears auth + learning stores but NOT settings store (language/theme persists)
- Delete account: requires typed "DELETE" confirmation

### `lib/subscription.js` — exact spec §7 implementation
### `lib/secureStorage.js` — separate key per provider: `learnly_byok_openai`, etc.

**AppState polling:** `refreshSubscriptionStatus` fires on every foreground return — user just paid on Stripe website expects tier update within 5s.

**Verify:** "Subscribe on website" opens Stripe checkout. Return to app → tier updates. BYOK key survives app restart.

---

## Phase 5 — Offline + Polish

**Creates:** SQLite cache, sync queue, streak UI, XP bar, error states

### Offline layer (`lib/offline.js`)
SQLite tables: `cached_lessons`, `cached_quizzes`, `cached_ai_explanations`, `cached_roadmaps`, `sync_queue`

- `preCacheNode(nodeId, language)` — parallel: lesson + quiz + AI explanation
- `addToSyncQueue(type, payload)` — types: `progress_update`, `quiz_result`, `tutor_message`
- On offline lesson open: try cache first; on miss: "Lesson not available offline. Open while connected to cache it."

### Sync queue flush (`hooks/useOfflineSync.js`)
`NetInfo.addEventListener` → on reconnect → flush queue item by item. Safe to retry: `node_completions` has `ON CONFLICT DO NOTHING`.

### Dashboard (`app/(tabs)/index.jsx`)
5 sections per spec §3.2: header (localized greeting), streak+XP card (gradient), continue learning, recommended roadmaps (horizontal scroll), recent activity.

### Common components
- `RateLimitBanner` — show if remaining ≤3; amber tint at 1; disable send at 0
- `LoadingSkeleton` — Reanimated shimmer; variants: text/card/avatar/graph-node
- `OfflineBanner` — fixed top bar when `NetInfo.isConnected === false`

**Error state rule:** every screen handles: offline → cached content + banner; 401 → clear session + redirect; 429 → rate limit banner; 500 → pull-to-refresh.

**Verify:** Airplane mode → lesson loads from SQLite. Complete node offline → in sync queue. Reconnect → synced. After 10 AI calls → send disabled.

---

## Phase 6 — Backend V2 (feature-flagged)

Each endpoint checks `process.env.FEATURE_ENABLED !== 'true'` → returns 404.

### AI Roadmap Generation (`api/ai/roadmap.ts`)
- Pro-only gate (403 for free)
- 2-stage with platform Gemini (paid key — complex reasoning); structured JSON output via `responseMimeType: "application/json"`
- Stage 1: `extractScope` → structured params
- Stage 2: `generateGraph` → nodes + edges JSONB (max 20 nodes)
- Validation: topological sort (detect cycles) + BFS (detect disconnected nodes); retry once on failure

### Provider router V2 (`lib/providers/`)
All providers MUST normalize output to the same SSE format — `StreamingText.jsx` parses only one format. Zero frontend changes when providers change.
- `gemini.ts` (already implemented in Phase 1 for platform use) — also used for BYOK Gemini
- `claude.ts` — BYOK only: `claude-haiku-4-5-20251001`, system → top-level `system` field
- `openai.ts` — BYOK only: user's model choice
- `azure.ts` — BYOK only

### SRS endpoints (`api/srs/`)
- `queue.ts` — `next_review_at <= now()`, join roadmap nodes for titles, limit 10
- `review.ts` — SM-2 in `lib/srs.ts` as pure function (unit test: quality=5,interval=6 → interval≈15; quality=2 → interval=1,repetitions=0)

### Community (`api/community/`)
- Rate limit upvotes: 1 per user per item via Redis key `upvote:{userId}:{itemId}`
- AI summary of top 5 answers, cached 1 day

### Analytics (`api/analytics/`)
- `radar.ts` — aggregate node_completions by category → avg quiz score; Pro-only
- `heatmap.ts` — completions grouped by UTC date, last 90 days
- `weakareas.ts` — nodes where quiz_score < 70 or feynman_score < 70

### Voice (`api/ai/voice.ts`)
- Whisper proxy, Pro-only, reject files >2MB before forwarding

**Verify:** Flag off → 404. Flag on + Pro token → roadmap JSON returned. SRS review quality=5 → interval_days increases.

---

## Phase 7 — Frontend V2 (feature-flagged)

All V2 UI behind `FEATURES.*` — merged to main, shipped disabled.

### Roadmap generation (`app/generate/`)
- `<SubscriptionGate feature="AI Roadmap Generation">` wrapper
- ~15s wait with staged progress: "Analyzing goal..." → "Building roadmap..." (Reanimated progress bar)
- Result: preview first 5 nodes → "Looks good" or "Regenerate" (with confirmation — costs AI credits)

### SRS Review UI (`components/SRS/`, `app/(tabs)/my-learning.jsx`)
- 5-button rating: Again/Hard/Good/Easy/Perfect (quality 0–5)
- "📚 {n} due today" badge on My Learning tab
- "All done for today 🎉" completion state

### Voice (`hooks/useVoice.js`, `components/AITutor/VoiceInput.jsx`, `VoiceOutputButton.jsx`)
- `expo-av` recording → multipart FormData → `POST /api/ai/voice` → transcript inserted as text
- TTS per AI bubble via `expo-speech`; language map: en→'en-US', hi→'hi-IN', ar→'ar-SA'

### Analytics (`app/analytics/index.jsx`)
- `<SubscriptionGate feature="Learning Analytics">`
- Skill radar (react-native-gifted-charts RadarChart)
- GitHub-style heatmap, stats cards, weak areas list

### V2 graph enhancements
- `GraphMinimap.jsx` — top-right corner, collapsible, viewport indicator rectangle
- Node unlock animation: `withSpring` scale-up + border color transition on `locked → available`
- Edge draw animation: `stroke-dashoffset` from full to 0 on parent completion

### BYOK multi-provider
- Separate SecureStore key per provider: `learnly_byok_openai`, `learnly_byok_gemini`, `learnly_byok_claude`, `learnly_byok_azure`
- "Validate key" button sends test request before saving
- All providers available in BYOK V2 (OpenAI, Gemini, Claude, Azure)
- UI label when using BYOK: "Using your own API key" — no mention of which underlying model powers the platform AI
- When no BYOK key: UI shows "Platform AI" — no provider name shown to user

**Verify:** All V2 flags false → zero V2 UI visible. Each flag flipped → only that feature appears.

---

## Cross-Cutting Rules

1. **Zero hardcoded strings** — every user-visible string goes through `t('key')` including errors, empty states, toasts
2. **Every screen has an offline state** — cache before network, no blank screens or infinite spinners
3. **Rate limit always visible** — `RateLimitBanner` in TutorChat, lesson screen near "Ask AI", profile screen
4. **Theme via hook only:** `const theme = useTheme()` — never direct import of `DARK_THEME`
5. **V2 behind feature flags:** `{FEATURES.SRS && <SRSReviewBanner />}` — never `enabled={false}` prop pattern
6. **Subscription tier is server-authoritative** — client stores for UX speed, every Pro API checks server-side
7. **BYOK keys never logged, never stored in Supabase/Redis, never returned in responses**

---

## Risk Register

| Risk | Phase | Mitigation |
|------|-------|-----------|
| Dagre CommonJS import fails in Metro | 3 | `resolver.unstable_enablePackageExports: false` in metro.config.js |
| RTL reload doesn't work in Expo Go | 2 | RTL requires EAS dev build — document clearly |
| Stripe webhook raw body corrupted | 1 | `await req.text()` not `req.json()` in webhook.ts |
| Feynman response in markdown fences | 1, 3 | `response_format: { type: 'json_object' }` on all structured OpenAI calls |
| Apple OAuth fails in simulator | 2 | Apple OAuth requires physical device with Face ID |
| SVG pinch+pan conflicts with scroll | 3 | `simultaneousHandlers` — test on physical device |
| expo-sqlite sync API unavailable | 5 | Requires Expo SDK 50+; confirm before Phase 5 |
| Vercel Edge function timeout | 1 | 800 max_tokens at gpt-4o-mini ≈ 8s, under 25s Edge limit |

---

## Key Files to Create (Critical Path)

- `backend/api/ai/stream.ts` — most complex backend file (Edge + SSE + rate limiting + BYOK + platform Gemini routing)
- `frontend/components/RoadmapGraph/useGraphLayout.js` — highest technical risk (dagre + SVG + gesture handler)
- `frontend/app/_layout.jsx` — root orchestrator (auth, i18n init, AppState polling, deep-link handling)
- `frontend/hooks/useAIStream.js` — streaming fetch + SSE parser + rate limit header extraction
- `docs/schema.sql` + trigger function — must be correct before any backend endpoint works