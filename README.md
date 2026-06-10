# logiq-ai

AI-powered multilingual learning app. Study any topic — programming, finance, leadership, public speaking — and get a personalised course or structured roadmap built around your experience level and field.

Built with React Native (Expo) + Vercel Edge Functions + Supabase + Gemini 2.0 Flash.

---

## What it does

**Two learning modes:**

**Roadmap** — structured, graph-based learning paths. Pick a curated roadmap, follow nodes in order, complete lessons and quizzes to unlock the next step. Visualised as an interactive DAG you can pinch and pan.

**Course** — open-ended. Type any topic and get a personalised outline in seconds. Sections are generated on demand when you open them — no waiting for content you'll never read.

Both modes adapt to your profile: a senior engineer studying "system design" gets a different course than a student asking the same question.

---

## Features

- **Lazy AI generation** — outline generated first (~2s), section content only when you open it (~5s), quiz only when you finish a section. Never generates content you don't use.
- **Personalised to your level** — fill in your field, years of experience, and existing skills. The AI skips what you already know and calibrates depth to your level.
- **AI Tutor chat** — ask questions about any lesson. Responses stream token-by-token in real-time.
- **Feynman quizzes** — every quiz ends with an open-text question: explain the concept in your own words. AI-graded.
- **BYOK (Bring Your Own Key)** — paste an OpenAI or Gemini key to use your own quota. Keys live in device secure storage only — never sent to a database, never logged.
- **Multilingual** — English, Hindi, Arabic. All content generated in your chosen language.
- **Offline** — lessons and roadmaps cached to SQLite on first open. Progress syncs when you reconnect.
- **Token tracking** — every generation is recorded server-side with prompt/completion counts. The underlying model is never exposed to the client.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native, Expo SDK 52, Expo Router v4 |
| Styling | NativeWind, Gluestack UI v2 |
| State | Zustand |
| Backend | Vercel (Edge + Node serverless), TypeScript, Node 22 |
| Database | Supabase (Postgres + Auth + RLS) |
| Platform AI | Gemini 2.0 Flash via `@google/genai` SDK |
| BYOK AI | OpenAI, Claude, Azure (user-supplied keys) |
| Rate limiting | Upstash Redis (sliding window) |
| Offline cache | expo-sqlite v15 |
| i18n | i18next + react-i18next |
| Graph layout | dagre + react-native-svg + Reanimated |

---

## Project structure

```
logiq-ai/
├── backend/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── stream.ts              # Edge runtime — AI tutor SSE streaming
│   │   │   ├── outline.ts             # Course outline generation (stage 1, ~200 tokens)
│   │   │   ├── content.ts             # Section content on demand (stage 2, ~500 tokens)
│   │   │   ├── explain.ts             # Roadmap node lesson content
│   │   │   ├── quiz.ts                # Roadmap node quiz
│   │   │   ├── feynman.ts             # Grade open-text Feynman explanations
│   │   │   └── quiz/
│   │   │       └── section.ts         # Lazy quiz per course section
│   │   ├── auth/
│   │   │   ├── callback.ts            # OAuth redirect handler
│   │   │   └── user.ts                # Profile CRUD (GET / PATCH / DELETE)
│   │   ├── courses/
│   │   │   ├── index.ts               # List user's courses
│   │   │   └── [id].ts                # Course detail + archive
│   │   ├── progress/                  # Node completion, streak, XP
│   │   ├── roadmap/                   # Curated roadmap list + detail with user progress
│   │   └── subscription/              # Stubbed for beta (Razorpay post-beta)
│   └── lib/
│       ├── providers/
│       │   ├── gemini.ts              # @google/genai SDK (JSON) + raw fetch (SSE)
│       │   ├── openai.ts              # BYOK only
│       │   ├── claude.ts              # BYOK only
│       │   └── azure.ts               # BYOK only
│       ├── prompts.ts                 # All prompt builders with UserContext injection
│       ├── tokenUsage.ts              # Server-side token tracking (writes to DB)
│       ├── cache.ts                   # Supabase AI response cache
│       ├── ratelimit.ts               # Upstash sliding window
│       └── auth.ts                    # JWT validation helper
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/                    # Onboarding, login, register
│   │   ├── (tabs)/
│   │   │   ├── index.jsx              # Dashboard — streak, active roadmaps, courses CTA
│   │   │   ├── explore.jsx            # Browse + search curated roadmaps
│   │   │   ├── my-learning.jsx        # Roadmaps tab + My Courses tab
│   │   │   └── profile.jsx            # BYOK, About You, theme, language, account
│   │   ├── roadmap/[id].jsx           # Interactive roadmap graph
│   │   ├── lesson/[nodeId].jsx        # 5-block lesson (concept, visual, code, try-it, deeper)
│   │   ├── quiz/[nodeId].jsx          # MCQ + Feynman, node unlock on pass
│   │   └── course/
│   │       ├── new.jsx                # Topic input → calls /api/ai/outline
│   │       ├── [id].jsx               # Course with section accordion + progress
│   │       └── [id]/section/
│   │           └── [sectionId].jsx    # Lazy content load + inline quiz
│   ├── components/
│   │   ├── RoadmapGraph/              # dagre layout, SVG nodes + edges, pinch/pan
│   │   ├── AITutor/                   # Streaming chat UI
│   │   └── Common/                    # LoadingSkeleton, OfflineBanner, RateLimitBanner
│   ├── store/                         # auth, learning, roadmap, course, settings (Zustand)
│   ├── hooks/                         # useAIStream, useTheme, useOfflineSync
│   └── lib/                           # api.js, offline.js, supabase.js, secureStorage.js
│
└── docs/
    ├── schema.sql                     # Core tables + auto-profile trigger
    ├── rls-policies.sql               # Row-level security for all tables
    ├── seed.sql                       # 3 starter roadmaps
    ├── migrations/
    │   └── 002_courses_tokens.sql     # Courses, token tracking, profile fields
    ├── SETUP.md                       # Full deployment guide (~40 min)
    └── PHASES.md                      # Build progress + V2 roadmap
```

---

## Getting started

See **[docs/SETUP.md](docs/SETUP.md)** for the full guide. Everything runs on free tiers.

```bash
# 1. Supabase — create project, run SQL files in order:
#    schema.sql → rls-policies.sql → seed.sql → migrations/002_courses_tokens.sql

# 2. Upstash — create Redis database, copy REST URL + token

# 3. Google AI Studio — get a Gemini API key

# 4. Deploy backend
cd backend
npm install
vercel --prod   # add env vars in Vercel dashboard first (see SETUP.md)

# 5. Configure frontend
cd frontend
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_BASE_URL

# 6. Run on your phone
npx expo start  # scan QR code with Expo Go
```

---

## AI design decisions

**Why Gemini 2.0 Flash?**  
Best tokens-per-second-per-dollar for this generation pattern: short structured JSON outputs (200–800 tokens). The SDK (`@google/genai` v2) is used for JSON generation endpoints where typed `usageMetadata` matters. Raw fetch is kept for the streaming edge function where Node.js SDK compatibility isn't guaranteed.

**Why lazy generation?**  
A 6-section course outline is ~200 tokens. Generating all 6 sections upfront is ~3 000 tokens and 30+ seconds of wait. Most users read 1–2 sections per session. Lazy generation means users pay (in latency and quota) only for what they actually open.

**Why is the model name hidden?**  
The underlying model is an implementation detail that will change. Users interact with "AI Tutor" — not "Gemini 2.0 Flash". This also lets the platform swap models without any client-side changes.

**Token tracking**  
Every generation call writes a row to `token_usage` (user, date, model, endpoint, prompt tokens, completion tokens). Server-authoritative — the client never reports its own counts. Used for abuse detection and future billing.

---

## Security

- `SUPABASE_SERVICE_ROLE_KEY` is backend-only, never in the frontend bundle
- BYOK keys: stored in `expo-secure-store`, sent over HTTPS per-request in `X-BYOK-Key`, never written to Supabase or Redis, never logged, never returned in responses
- Subscription tier is server-authoritative — client caches it for UI speed, every gated endpoint re-checks the server
- RLS policies ensure users can only access their own rows. Service role is used only for operations that require it (token inserts, account deletion)

---

## Beta limits

| What works | What's stubbed / V2 |
|------------|---------------------|
| Free tier (10 AI calls/day) | Payments — Razorpay post-beta |
| BYOK (OpenAI + Gemini) | Apple Sign In — needs EAS build |
| Roadmaps + Courses | Arabic RTL layout — needs EAS build |
| AI Tutor streaming | Push notifications |
| MCQ + Feynman quizzes | Spaced repetition queue |
| Offline caching + sync | AI roadmap generation |
| Multilingual content | Community Q&A per node |
| Profile personalisation | Voice input / output |

---

## Licence

MIT
