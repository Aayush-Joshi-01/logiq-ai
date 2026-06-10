# logiq-ai — Phases & Remaining Work

Last updated: 2026-06-10

---

## What's Done ✅

### Phase 0 — Scaffolding
- Supabase schema (11 tables + auto-profile trigger + indexes)
- RLS policies for all user-owned tables
- Seed data: 3 curated roadmaps (Web Dev, Python DS, React Native)
- Full monorepo structure: `backend/`, `frontend/`, `docs/`

### Phase 1 — Backend V1 (complete)
- All AI endpoints: `stream.ts` (Edge + SSE), `explain.ts`, `quiz.ts`, `feynman.ts`
- Platform AI = Gemini only; BYOK routes to OpenAI/Claude/Azure
- Progress: `node.ts` with `unlockNextNodes` algorithm, streak, XP
- Subscription: **Stripe stubbed out** for beta (returns 503) — Razorpay post-beta
- Provider layer: Gemini + OpenAI + Claude + Azure, all normalized to OpenAI SSE format
- Rate limiting: free = 10 calls/24h (Upstash sliding window)
- AI cache: 30-day for explanations, 7-day for quizzes

### Phase 2 — Frontend Foundation (complete)
- Expo Router skeleton: auth + tabs + dynamic routes
- 5-step onboarding wizard (language → goal → level → time → account)
- 4 Zustand stores: auth, learning, roadmap, settings
- i18n: EN / HI / AR locales with RTL detection
- SQLite offline cache + sync queue
- `useAIStream.js` — fetch + ReadableStream SSE parser
- Common components: LoadingSkeleton, OfflineBanner, RateLimitBanner, SubscriptionGate (beta pass-through)

### Phase 3 — Core Learning Loop (complete)
- `RoadmapGraph/` — dagre layout, SVG nodes + edges, pinch/pan gesture, unlock animations
- `roadmap/[id].jsx` — bottom sheet, FAB → AI Tutor modal, long-press actions
- `lesson/[nodeId].jsx` — 5-block layout (concept, visual, code, try-it, go-deeper), CodeBlock, offline pre-cache
- `AITutor/` — TutorChat, StreamingText, MessageBubble
- `quiz/[nodeId].jsx` — MCQ (1.5s delay) + Feynman Q5, pass/fail, node unlock
- `useAIStream.js` — improved buffer handling

### Phase 4 — Profile & Dashboard (complete)
- `(tabs)/index.jsx` — Dashboard: greeting, streak+XP card, continue learning, recommended roadmaps, recent activity
- `(tabs)/explore.jsx` — Search, category filters, roadmap grid, enroll
- `(tabs)/my-learning.jsx` — Active roadmaps with progress bars, resume button
- `(tabs)/profile.jsx` — BYOK panel (OpenAI + Gemini), theme toggle, language selector, stats, sign out, delete account

---

## What's Left to Build 🔨

### Phase 5 — Offline + Polish (next up)

**Backend changes:** none

**Frontend:**

| File | What to build |
|------|--------------|
| `hooks/useOfflineSync.js` | Already scaffolded — verify sync queue flushes on reconnect |
| `lib/offline.js` | `preCacheNode` is done — add `preCacheRoadmap` call on roadmap open |
| Every screen | Add error boundary: offline → cached content; 401 → redirect; 500 → pull-to-refresh |
| `app/roadmap/[id].jsx` | Load from offline cache if network fails |
| `app/lesson/[nodeId].jsx` | Show "Not available offline" message on cache miss |

**Polish checklist:**
- [ ] Pull-to-refresh on Dashboard, Explore, My Learning
- [ ] Empty states: no roadmaps enrolled, no recent activity, no search results
- [ ] Haptic feedback on quiz answers (correct = light, wrong = medium)
- [ ] Node completion confetti / micro-animation
- [ ] Tab bar badge on My Learning when active roadmap exists
- [ ] App icon + splash screen (use `#0D1321` background, `#748CAB` accent)
- [ ] Deep link: `logiqai://roadmap/:id` opens roadmap directly

---

### Razorpay Integration (post-beta, ~Phase 4.5)

When: after beta confirms users want to pay.

**Backend — new files:**
```
backend/api/subscription/create-order.ts    POST — creates Razorpay order, returns { orderId, amount, currency }
backend/api/subscription/verify.ts          POST — verifies payment signature, updates profile tier, busts Redis cache
```

**Frontend:**
```
frontend/lib/razorpay.js                    initPayment(orderId, ...) wrapper
frontend/app/subscription/index.jsx         Replace "coming soon" with pricing cards + Razorpay checkout sheet
frontend/components/Common/SubscriptionGate.jsx   Restore tier gating
```

**Install:** `npm install react-native-razorpay` (requires EAS build — not available in Expo Go)

**Pricing suggestion (Indian EdTech):**
- Free: 10 AI calls/day, platform Gemini, 3 roadmaps
- Pro: ₹199/mo or ₹1,499/yr — unlimited AI calls, all roadmaps, priority Gemini

**Apple compliance note:** Razorpay in-app payments for cross-platform subscription services fall under the developer program license agreement Section 3.1.3(a) — you must also offer Apple IAP at the same price. Consult before App Store submission.

---

### Phase 6 — Backend V2 (feature-flagged, ship when ready)

All endpoints check `process.env.FEATURE_* !== 'true'` → return 404 if disabled.

| File | Feature | Gate env var | Priority |
|------|---------|-------------|----------|
| `api/ai/roadmap.ts` | AI roadmap generation (Pro) | `FEATURE_GENERATION_ENABLED` | High |
| `api/srs/queue.ts` | SRS review queue — due items | `FEATURE_SRS_ENABLED` | High |
| `api/srs/review.ts` | SM-2 algorithm update | `FEATURE_SRS_ENABLED` | High |
| `api/analytics/radar.ts` | Skill category radar (Pro) | `FEATURE_ANALYTICS_ENABLED` | Medium |
| `api/analytics/heatmap.ts` | 90-day activity heatmap | `FEATURE_ANALYTICS_ENABLED` | Medium |
| `api/analytics/weakareas.ts` | Nodes where score < 70% | `FEATURE_ANALYTICS_ENABLED` | Medium |
| `api/community/[nodeId].ts` | Q&A per node | `FEATURE_COMMUNITY_ENABLED` | Low |
| `api/ai/voice.ts` | Whisper transcription proxy (Pro, reject >2MB) | `FEATURE_VOICE_ENABLED` | Low |

**AI Roadmap Generation detail:**
- 2-stage Gemini (paid key): Stage 1 `extractScope` → Stage 2 `generateGraph`
- Output: nodes + edges JSONB (max 20 nodes)
- Validation: topological sort (detect cycles) + BFS (detect disconnected nodes), retry once on failure
- `responseMimeType: "application/json"` for structured output

**SRS (SM-2) detail:**
- `lib/srs.ts` already scaffolded — unit test: quality=5,interval=6 → interval≈15; quality=2 → interval=1
- `srs_entries` table already in schema

---

### Phase 7 — Frontend V2 (feature-flagged, ship when ready)

All V2 UI behind `FEATURES.*` constants — merged to main, shipped disabled.

| File | Feature | Depends on |
|------|---------|-----------|
| `app/(tabs)/my-learning.jsx` | SRS review queue at top (due-today badge on tab) | Phase 6 SRS |
| `components/SRS/ReviewCard.jsx` | 5-button rating: Again/Hard/Good/Easy/Perfect | Phase 6 SRS |
| `app/generate/index.jsx` | AI roadmap generation screen — staged progress, preview | Phase 6 roadmap generation |
| `app/analytics/index.jsx` | Skill radar + GitHub heatmap + weak areas | Phase 6 analytics |
| `components/AITutor/VoiceInput.jsx` | expo-av recording → multipart POST → transcript | Phase 6 voice |
| `components/AITutor/VoiceOutputButton.jsx` | expo-speech TTS per AI bubble | Phase 6 voice |
| `components/RoadmapGraph/GraphMinimap.jsx` | Collapsible top-right minimap + viewport rect | - |
| `hooks/useVoice.js` | Recording lifecycle + waveform state | Phase 6 voice |

**Graph V2 enhancements:**
- Edge draw animation: `stroke-dashoffset` from full → 0 on parent completion
- Node label overflow: expand on tap vs truncate
- Minimap: 80×100px, shows full graph scaled down, viewport indicator rectangle

---

## Long-Term: App Store Deployment

### EAS Build Setup

```bash
npm install -g eas-cli
eas login
cd frontend && eas build:configure
```

Create `frontend/eas.json`:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Pre-submission Checklist

**App identity:**
- [ ] Replace all `learnlyai://` scheme references with `logiqai://` in `frontend/app.json` and `backend/api/auth/callback.ts`
- [ ] App icon: 1024×1024 PNG, no alpha channel, no rounded corners (OS applies them)
- [ ] Splash screen: `#0D1321` background, centered logiq-ai wordmark
- [ ] App Store name: "logiq-ai: Learn with AI"
- [ ] Short description (30 chars): "AI-powered learning roadmaps"

**Legal (required before App Store submission):**
- [ ] Privacy policy hosted at a live URL (e.g., `https://logiq-ai-backend.vercel.app/privacy`)
- [ ] Terms of service URL
- [ ] EULA (if needed for paid tier)

**Technical:**
- [ ] Android: target API level 34+, `minSdkVersion 24`
- [ ] iOS: deployment target iOS 16+
- [ ] 64-bit ABI: `armeabi-v7a` + `arm64-v8a` both included
- [ ] Push notifications: `expo-notifications` + Supabase Edge Function for streak reminders

**Distribution:**
- iOS: Apple Developer account ($99/yr) → EAS Build → TestFlight → App Store
- Android: Google Play Console ($25 one-time) → internal → closed testing → production

### Deployment commands

```bash
# Internal test build (APK for Android, IPA for iOS TestFlight)
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform all

# Submit to stores (after build completes)
eas submit --platform ios
eas submit --platform android
```

---

## Architecture at a Glance

```
logiq-ai/
├── backend/          Vercel (Edge + Serverless)
│   ├── api/ai/       stream [Edge], explain, quiz, feynman
│   ├── api/progress/ node (unlockNextNodes), streak
│   ├── api/roadmap/  list + single with progress overlay
│   ├── api/auth/     OAuth callback, user CRUD
│   ├── api/subscription/ STUBBED for beta (Razorpay post-beta)
│   └── lib/          supabase, redis, ratelimit, prompts, providers/
│
├── frontend/         Expo + Expo Router
│   ├── app/          File-based routing (auth/, tabs/, roadmap/, lesson/, quiz/)
│   ├── components/   RoadmapGraph/, AITutor/, Common/
│   ├── hooks/        useAIStream, useRateLimit, useTheme, useOfflineSync
│   ├── store/        auth, settings, learning, roadmap (Zustand)
│   ├── lib/          api, supabase, offline (SQLite), i18n, secureStorage
│   └── locales/      en/ hi/ ar/ (4 namespaces each)
│
└── docs/
    ├── schema.sql        11 Supabase tables
    ├── rls-policies.sql  Row-level security
    ├── seed.sql          3 starter roadmaps
    ├── SETUP.md          ← This setup guide
    ├── PHASES.md         ← This document
    ├── backend-spec.md   Full backend specification
    └── frontend-spec.md  Full frontend specification
```

---

## Key Decisions & Constraints

| Decision | Reason |
|----------|--------|
| Gemini only for platform AI | Cost + free quota; never disclosed to users |
| BYOK users bypass platform rate limit | They pay for their own API quota |
| Stripe removed, Razorpay post-beta | Beta validates demand before payment complexity |
| RTL deferred to EAS build | `Updates.reloadAsync()` is a no-op in Expo Go |
| Supabase auto-profile trigger | Prevents "profile not found" on first login |
| Edge runtime for stream.ts | Lower latency streaming; all other endpoints are serverless |
| SQLite cache offline-first | Every screen must work without network after first load |
| BYOK keys never stored server-side | Security: keys live in `expo-secure-store` only |
| `SubscriptionGate` pass-through in beta | No payment infra = no gating; gates restore with Razorpay |
