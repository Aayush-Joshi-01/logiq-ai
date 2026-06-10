# logiq-ai — Deployment Guide
### From zero to running on your phone — Expo Go + Vercel

No paid accounts required. Everything below uses free tiers.  
Estimated time: **~40 minutes** the first time.

---

## What you'll set up

| Service | What for | Free tier |
|---------|----------|-----------|
| Supabase | Database, Auth, Row-level security | 500 MB DB, 50K MAU |
| Railway | Backend API (Hono + Bun server) | 500 hours/month (Starter) |
| Upstash Redis | Rate limiting per user | 10K req/day |
| Google AI Studio | Gemini 2.0 Flash (platform AI) | 15 RPM / 1M tokens/day |
| Expo Go (phone app) | Run the React Native frontend | Free |

---

## Prerequisites

```bash
node --version    # needs 20+
git --version
```

Install **Expo Go** on your phone:
- iOS → [App Store](https://apps.apple.com/app/expo-go/id982107779)
- Android → [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

Clone the repo and install root dependencies:

```bash
git clone <your-repo-url>
cd logiq-ai
```

---

## Step 1 — Supabase (Database + Auth)

### 1.1 Create project

1. Go to [supabase.com](https://supabase.com) → **New project**
   - Name: `logiq-ai`
   - Database password: generate a strong one and save it
   - Region: pick closest to your users

2. Wait for the project to finish provisioning (~2 min)

### 1.2 Run database migrations

Open **SQL Editor** in the Supabase dashboard (left sidebar).  
Run each file below in a **new query tab** — paste the contents, click **Run**, confirm no errors before moving to the next.

**Run in this exact order:**

```
1. docs/schema.sql              ← 11 core tables + triggers
2. docs/rls-policies.sql        ← Row-level security policies
3. docs/seed.sql                ← 3 starter roadmaps
4. docs/migrations/002_courses_tokens.sql  ← Courses, token tracking, profile fields
```

> What migration 002 adds:
> - `courses` + `course_sections` + `section_content` + `section_quizzes` — for the AI course flow
> - `token_usage` — server-side token tracking per user
> - 4 new columns on `profiles`: `work_field`, `years_experience`, `learning_summary`, `skills[]`

If you get a "relation already exists" error on any statement, that's fine — just continue.

### 1.3 Configure Auth

**Email auth** (already on by default — nothing to do).

### 1.4 Copy your credentials

Supabase Dashboard → **Settings** → **API**:

| What | Where | Used as |
|------|-------|---------|
| Project URL | `https://xxxx.supabase.co` | `SUPABASE_URL` (backend) + `EXPO_PUBLIC_SUPABASE_URL` (frontend) |
| `anon` / public key | Under "Project API keys" | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | Under "Project API keys" | `SUPABASE_SERVICE_ROLE_KEY` — server only, never expose |

---

## Step 2 — Upstash Redis (Rate Limiting)

1. Go to [upstash.com](https://upstash.com) → **Create Database**
   - Name: `logiq-ai-ratelimit`
   - Type: **Regional** (free tier)
   - Region: match your Vercel region (usually `us-east-1`)

2. Open the database → **REST API** tab → copy:
   - **UPSTASH_REDIS_REST_URL** (`https://xxxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (`AX...`)

---

## Step 3 — Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com) → **Get API key** → **Create API key**
2. Select or create a Google Cloud project
3. Copy the key (starts with `AIza...`)

> During beta, use this one key for both `GEMINI_FREE_API_KEY` and `GEMINI_PAID_API_KEY`.  
> Free tier: 15 requests/min, 1M tokens/day — plenty for beta.

---

## Step 4 — Deploy Backend to Railway

The backend runs as a single **Hono + Bun** server on Railway (free tier, no function limits).

### 4.1 Install Bun

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verify: `bun --version`

### 4.2 Generate the Bun lockfile

```bash
cd backend
bun install       # creates bun.lockb — Railway needs this to detect Bun
```

### 4.3 Test locally before deploying

```bash
bun run index.ts
# → Server running on http://localhost:3000
```

In another terminal:
```bash
curl http://localhost:3000/health
# → {"ok":true}
```

You'll need the env vars set locally for full API testing:
```bash
# PowerShell
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
# ... etc, then run bun run index.ts
```

### 4.4 Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo**
3. Authorise Railway to access your GitHub account
4. Select your `logiq-ai` repo
5. Railway asks which directory — set **Root Directory** to `backend`
6. It will start a first deploy (it'll fail — env vars not set yet)

### 4.5 Add environment variables

Railway Dashboard → your service → **Variables** tab → **Add Variable** for each:

| Variable | Value | Source |
|----------|-------|--------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Step 1.4 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Step 1.4 — server only |
| `UPSTASH_REDIS_REST_URL` | `https://xxxx.upstash.io` | Step 2 |
| `UPSTASH_REDIS_REST_TOKEN` | `AX...` | Step 2 |
| `GEMINI_FREE_API_KEY` | `AIza...` | Step 3 |
| `GEMINI_PAID_API_KEY` | `AIza...` | Step 3 (same key for beta) |

Railway automatically sets `PORT` — the server reads it via `process.env.PORT`.

After adding all variables, Railway redeploys automatically.

### 4.6 Get your public URL

Railway Dashboard → your service → **Settings** → **Networking** → **Generate Domain**

This gives you a URL like `https://logiq-ai-be.up.railway.app`.

### 4.7 Wire Supabase OAuth callback

Supabase Dashboard → **Authentication** → **URL Configuration** → **Redirect URLs** → Add:

```
https://logiq-ai-be.up.railway.app/api/auth/callback
```

### 4.8 Verify backend

```bash
curl https://logiq-ai-be.up.railway.app/health
# → {"ok":true}

curl https://logiq-ai-be.up.railway.app/api/roadmap
# → JSON array with 3 roadmaps
```

If something fails: Railway Dashboard → your service → **Logs** tab shows full output.

---

## Step 5 — Configure Frontend

```bash
cd ../frontend
npm install
cp .env.example .env
```

Open `.env` and fill in:

```bash
# Supabase — from Step 1.4
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Backend — your Railway or Vercel URL from Step 4
EXPO_PUBLIC_API_BASE_URL=https://logiq-ai-be.up.railway.app

# Beta: leave blank
EXPO_PUBLIC_STRIPE_CHECKOUT_URL=

# V2 features: all off for beta
EXPO_PUBLIC_VOICE_ENABLED=false
EXPO_PUBLIC_SRS_ENABLED=false
EXPO_PUBLIC_COMMUNITY_ENABLED=false
EXPO_PUBLIC_ANALYTICS_ENABLED=false
EXPO_PUBLIC_GENERATION_ENABLED=false
EXPO_PUBLIC_ADAPTIVE_ENABLED=false
```

> **No trailing slash** on `EXPO_PUBLIC_API_BASE_URL`. The app prepends paths like `/api/roadmap` directly.

---

## Step 6 — Run on Expo Go

```bash
cd frontend
npx expo start
```

Terminal shows a QR code.

- **iOS:** Open Expo Go → camera icon → scan
- **Android:** Open Expo Go → "Scan QR code" → scan

> **Same WiFi rule:** your phone and laptop must be on the same network.  
> If not possible (office NAT, phone data, etc.), use tunnel mode:
> ```bash
> npx expo start --tunnel
> ```
> This routes through Expo's servers — slower but works anywhere.

---

## Step 7 — First run checklist

Work through this top to bottom. Each step confirms a different part of the stack.

### Auth + DB
- [ ] Complete onboarding (5 steps)
- [ ] Sign up with email
- [ ] Supabase → **Authentication → Users** → your email appears
- [ ] Supabase → **Table Editor → profiles** → your row exists with `display_name`
- [ ] Supabase → **Table Editor → streaks** → your row exists

### Roadmap flow (existing)
- [ ] Home screen loads with greeting and streak card
- [ ] Explore tab shows 3 roadmaps (from `seed.sql`)
- [ ] Tap **Start Learning** on a roadmap → roadmap graph renders
- [ ] Tap a node → bottom sheet appears with title + "Start" button
- [ ] Start → lesson loads AI explanation (~3–5s on first load, instant on repeat)
- [ ] **Ask AI 💬** → tokens stream in real-time
- [ ] **I understand this** → quiz loads
- [ ] Complete quiz ≥ 80% → node turns green, adjacent node pulses blue

### Course flow (new)
- [ ] My Learning tab → **My Courses** tab → tap **+ Learn something new**
- [ ] Type any topic (e.g. "Personal finance basics") → tap **Generate Outline**
- [ ] Course outline appears with 4–7 section accordion rows (~3–5s)
- [ ] Tap a section → content generates and loads (~5–8s on first open)
- [ ] Supabase → **Table Editor → courses** → your course row exists
- [ ] Supabase → **Table Editor → course_sections** → section rows exist
- [ ] Supabase → **Table Editor → section_content** → content row appears after first open
- [ ] Tap **Take a quick quiz** → 4 questions + Feynman last

### Token tracking
- [ ] Supabase → **Table Editor → token_usage** → rows appear after any AI generation

### Profile personalisation
- [ ] Profile tab → **ABOUT YOU** section → fill in work field + years + skills → tap Save
- [ ] Generate a new course → content should reflect your level (e.g. an experienced engineer won't get "what is a variable")

### Rate limiting
- [ ] Make 10+ AI tutor calls (free tier) → rate limit banner appears
- [ ] Send button disables automatically

### BYOK
- [ ] Profile → **BRING YOUR OWN API KEY** → paste OpenAI or Gemini key → Save
- [ ] AI tutor chat shows "Using your own API key" badge
- [ ] Rate limit no longer applies for BYOK calls

---

## Common issues

**"Network request failed" on any API call**
→ `EXPO_PUBLIC_API_BASE_URL` has a trailing slash or is wrong. Remove the slash.

**Roadmap screen shows blank / infinite spinner**
→ `seed.sql` wasn't run. Go to Supabase SQL Editor → paste + run `docs/seed.sql`.

**Course outline generates but sections are empty in Supabase**
→ Migration 002 wasn't run. Run `docs/migrations/002_courses_tokens.sql` in Supabase SQL Editor.

**AI calls return 500 with "Gemini API error"**
→ `GEMINI_FREE_API_KEY` is wrong or missing in Railway Variables. Add it and Railway will redeploy automatically.

**"Invalid JWT" on authenticated requests**
→ Sign out and sign back in — the session expired.

**Rate limit never resets**
→ Upstash Redis not connected. Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Railway Variables.

**Build fails on Railway**
→ Check the Logs tab in Railway dashboard, or run locally first:
```bash
cd backend && bun run typecheck
```

**Google OAuth redirect fails**
→ Make sure your Railway URL `/api/auth/callback` is in Supabase **URL Configuration → Redirect URLs** (Step 4.7).

**Expo Go shows "Something went wrong" on startup**
→ Check `.env` — all `EXPO_PUBLIC_*` variables must be present. Missing variables are undefined (not empty string) in Expo.

---

## Local development

Run backend locally with hot-reload:

```bash
cd backend
bun --watch index.ts
# → Server running on http://localhost:3000
```

For local dev, point the frontend at your local server:

```bash
# frontend/.env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

> On an Android emulator use `http://10.0.2.2:3000` instead of localhost.  
> On a physical phone use your machine's LAN IP: `http://192.168.x.x:3000`  
> (find it with `ipconfig` on Windows or `ifconfig` on Mac/Linux)

Run frontend:

```bash
cd frontend
npx expo start
```

Type-check backend:

```bash
cd backend && bun run typecheck
```

Redeploy to Railway: just `git push` — Railway auto-deploys on every push to your connected branch.

---

## Known Expo Go limitations

| Feature | Status | Fix |
|---------|--------|-----|
| Arabic RTL layout | Doesn't work | Requires EAS Dev Build |
| Apple Sign In | Doesn't work | Use email/Google OAuth |
| `Updates.reloadAsync()` | No-op | Requires EAS build |
| Push notifications | Limited | Requires EAS build |

---

## What's behind each API endpoint

| Endpoint | Runtime | What it does |
|----------|---------|-------------|
| `POST /api/ai/stream` | **Edge** | AI tutor chat — SSE streaming |
| `POST /api/ai/outline` | Node 30s | Stage 1: generate course outline (headings only) |
| `POST /api/ai/content` | Node 30s | Stage 2: generate one section's content on demand |
| `POST /api/ai/quiz/section` | Node 30s | Lazy quiz per course section |
| `POST /api/ai/explain` | Node 30s | Roadmap node lesson content |
| `POST /api/ai/quiz` | Node 30s | Roadmap node quiz |
| `POST /api/ai/feynman` | Node 15s | Grade Feynman explanation |
| `GET /api/roadmap` | Node | List public roadmaps |
| `GET /api/roadmap/[id]` | Node | Roadmap with user progress |
| `GET /api/courses` | Node 15s | List user's courses |
| `GET /api/courses/[id]` | Node 15s | Course + sections |
| `DELETE /api/courses/[id]` | Node 15s | Archive course |
| `GET/PATCH/DELETE /api/auth/user` | Node | Profile CRUD |
| `PATCH /api/progress/node` | Node | Mark node complete, update streak |

> The platform AI is always Gemini 2.0 Flash. This is never revealed to users — it shows as "AI Tutor" only.  
> BYOK routes to the user's own key/provider (OpenAI, Gemini, Claude, Azure).
