# Learnly-AI — Deployment & Testing Guide

> Complete setup: Supabase → Upstash → Gemini → Stripe → Vercel backend → Expo frontend

---

## Prerequisites

Install these before starting:

```bash
# Node.js 20+ (check: node -v)
# https://nodejs.org

# Vercel CLI
npm install -g vercel

# Expo CLI + EAS CLI
npm install -g expo-cli eas-cli

# Git (check: git -v)
```

Accounts you need (all have free tiers):
| Service | URL | Purpose |
|---|---|---|
| Supabase | supabase.com | Database + Auth |
| Upstash | upstash.com | Redis rate limiting |
| Google AI Studio | aistudio.google.com | Gemini API keys |
| Stripe | stripe.com | Payments |
| Vercel | vercel.com | Backend hosting |
| Expo | expo.dev | App builds |
| Apple Developer | developer.apple.com | iOS builds ($99/yr) |

---

## Part 1 — Supabase Setup

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name: `learnly-ai`
3. Set a strong database password — **save it**, you'll need it
4. Region: pick closest to your users
5. Wait ~2 min for project to provision

### 1.2 Run the Schema

1. In Supabase dashboard → **SQL Editor** → **New query**
2. Open `docs/schema.sql` from this repo — paste the entire contents → **Run**
3. You should see: `Success. No rows returned`
4. New query → paste `docs/rls-policies.sql` → **Run**
5. New query → paste `docs/seed.sql` → **Run**

**Verify:**
- Go to **Table Editor** — you should see 11 tables
- Each table should show a 🔒 (shield) icon indicating RLS is enabled
- Go to **roadmaps** table — you should see 3 seed rows

### 1.3 Configure Auth Providers

1. Dashboard → **Authentication** → **Providers**

**Google:**
1. Enable **Google** toggle
2. Go to [console.cloud.google.com](https://console.cloud.google.com)
3. Create a project → **APIs & Services** → **Credentials** → **OAuth 2.0 Client IDs**
4. Application type: **Web application**
5. Authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
6. Copy **Client ID** and **Client Secret** → paste into Supabase Google provider settings

**Apple:**
1. Enable **Apple** toggle
2. Requires Apple Developer account ($99/yr)
3. [Create a Sign in with Apple Service ID](https://developer.apple.com/account/resources/identifiers/list/serviceId) — follow Supabase's [Apple OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)

> **Testing tip:** Google OAuth works in browser. Apple OAuth requires physical device with Face ID.

### 1.4 Get Your API Keys

Dashboard → **Settings** → **API**

Copy these — you'll need them shortly:
```
Project URL:          https://xxxxxxxxxxxx.supabase.co
anon/public key:      eyJhbGc...  (safe to expose to client)
service_role key:     eyJhbGc...  (NEVER expose — server-side only)
```

### 1.5 Set Redirect URL for OAuth

1. Dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** `https://your-vercel-domain.vercel.app`
3. **Redirect URLs** → Add:
   ```
   learnlyai://auth/callback
   https://your-vercel-domain.vercel.app/**
   ```

---

## Part 2 — Upstash Redis Setup

1. Go to [console.upstash.com](https://console.upstash.com) → **Create Database**
2. Name: `learnly-ai-redis`
3. Type: **Regional** (cheaper) or **Global** (faster worldwide)
4. Region: match your Vercel region
5. Click **Create**

6. On the database page → **REST API** tab
7. Copy:
   ```
   UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXxx...
   ```

---

## Part 3 — Gemini API Keys

You need **two separate keys** — one for free users, one for paid users.

### 3.1 Free Tier Key

1. Go to [aistudio.google.com](https://aistudio.google.com) → **Get API Key** → **Create API key**
2. Name: `learnly-free`
3. Copy key → this is `GEMINI_FREE_API_KEY`

> The free key has rate limits: 15 RPM, 1M tokens/day. Sufficient for development and early users.

### 3.2 Paid Tier Key

1. Create another key at the same place, name: `learnly-paid`
2. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Gemini API** → enable billing for higher quotas
3. Copy key → this is `GEMINI_PAID_API_KEY`

> For production: set up a [Google Cloud billing account](https://cloud.google.com/billing) to remove quota limits.

---

## Part 4 — Stripe Setup

### 4.1 Create Products and Prices

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → **Products** → **Add product**
2. Name: `Learnly AI Pro`
3. Add two prices:
   - **Monthly:** $9.99 / month → copy `price_xxx` ID → `STRIPE_MONTHLY_PRICE_ID`
   - **Yearly:** $79.99 / year → copy `price_xxx` ID → `STRIPE_YEARLY_PRICE_ID`

### 4.2 Get API Keys

Dashboard → **Developers** → **API keys**
```
Publishable key: pk_test_...  (not needed for backend)
Secret key:      sk_test_...  → STRIPE_SECRET_KEY
```

> Use **test mode** keys during development. Switch to live keys before launch.

### 4.3 Set Up Webhook (After Backend Deployed)

> Come back to this step after Part 5 (Vercel deployment).

1. Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-vercel-domain.vercel.app/api/subscription/webhook`
3. Events to listen for (select all 4):
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 4.4 Create Your Subscribe Page

The app redirects to `EXPO_PUBLIC_STRIPE_CHECKOUT_URL` for payment. This must be a web page you own that calls `POST /api/subscription/checkout` and redirects to the Stripe session URL.

Minimal example (host on Vercel or any web server):
```html
<!-- public/subscribe.html or pages/subscribe.tsx -->
<script>
  const params = new URLSearchParams(window.location.search)
  const userId = params.get('userId')
  const plan   = params.get('plan') || 'monthly'

  fetch('/api/subscription/checkout', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ userId, plan }),
  })
  .then(r => r.json())
  .then(({ url }) => window.location.href = url)
</script>
<p>Redirecting to checkout...</p>
```

---

## Part 5 — Backend: Deploy to Vercel

### 5.1 Initial Setup

```bash
# From repo root
cd backend

# Install deps (if not already done)
npm install

# Login to Vercel
vercel login
```

### 5.2 Link Project

```bash
vercel link
# ? Set up and deploy "learnly-ai/backend"? → Yes
# ? Which scope? → your account
# ? Link to existing project? → No
# ? Project name → learnly-ai-backend
# ? In which directory is your code located? → ./   (already in backend/)
```

> **Important:** In Vercel dashboard → Project Settings → **General** → set **Root Directory** to `backend`

### 5.3 Add Environment Variables

Run each of these (or add them in the Vercel dashboard):

```bash
vercel env add SUPABASE_URL
# → paste: https://xxxxxxxxxxxx.supabase.co

vercel env add SUPABASE_SERVICE_ROLE_KEY
# → paste: eyJhbGc... (service role key)

vercel env add UPSTASH_REDIS_REST_URL
# → paste: https://xxxx.upstash.io

vercel env add UPSTASH_REDIS_REST_TOKEN
# → paste: AXxx...

vercel env add GEMINI_FREE_API_KEY
# → paste: AIza... (free key)

vercel env add GEMINI_PAID_API_KEY
# → paste: AIza... (paid key)

vercel env add STRIPE_SECRET_KEY
# → paste: sk_test_...

vercel env add STRIPE_WEBHOOK_SECRET
# → paste: whsec_... (after step 4.3)

vercel env add STRIPE_MONTHLY_PRICE_ID
# → paste: price_...

vercel env add STRIPE_YEARLY_PRICE_ID
# → paste: price_...

vercel env add NEXT_PUBLIC_APP_URL
# → paste: https://your-vercel-domain.vercel.app

vercel env add ALLOWED_ORIGINS
# → paste: https://your-vercel-domain.vercel.app
```

Select **all environments** (Production, Preview, Development) for each.

### 5.4 Deploy

```bash
vercel deploy --prod
```

Output will show your URL: `https://learnly-ai-backend-xxxx.vercel.app`

### 5.5 Verify Backend is Live

```bash
# Should return list of roadmaps (or empty array)
curl https://learnly-ai-backend-xxxx.vercel.app/api/roadmap

# Expected: {"roadmaps":[{"id":"...","title":"Web Development Fundamentals",...}]}
```

---

## Part 6 — Frontend: Configure Environment

### 6.1 Create `.env.local`

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

EXPO_PUBLIC_API_BASE_URL=https://learnly-ai-backend-xxxx.vercel.app

# URL of your subscribe page (from Part 4.4)
EXPO_PUBLIC_STRIPE_CHECKOUT_URL=https://your-vercel-domain.vercel.app/subscribe

# V2 features — all false for now
EXPO_PUBLIC_VOICE_ENABLED=false
EXPO_PUBLIC_SRS_ENABLED=false
EXPO_PUBLIC_COMMUNITY_ENABLED=false
EXPO_PUBLIC_ANALYTICS_ENABLED=false
EXPO_PUBLIC_GENERATION_ENABLED=false
EXPO_PUBLIC_ADAPTIVE_ENABLED=false
```

---

## Part 7 — Run in Expo Go (Development)

Expo Go is the fastest way to test on your phone. It has limitations:
- ❌ RTL reload (Arabic) does not work
- ❌ Apple OAuth does not work
- ✅ Everything else works

### 7.1 Install Dependencies

```bash
cd frontend
npm install
```

### 7.2 Start Dev Server

```bash
npx expo start
```

You'll see a QR code in the terminal.

### 7.3 Open on Device

1. Install **Expo Go** from the App Store (iOS) or Play Store (Android)
2. iOS: open the Camera app → scan the QR code
3. Android: open Expo Go → scan the QR code

The app should load within ~10 seconds on first launch.

### 7.4 Test on iOS Simulator (No Physical Device)

```bash
# Start simulator
npx expo start --ios

# Or for Android
npx expo start --android
```

> Requires Xcode installed for iOS simulator. Android emulator requires Android Studio.

---

## Part 8 — EAS Build (TestFlight / Full Features)

EAS (Expo Application Services) creates real native builds. Required for:
- RTL layout (Arabic)
- Apple OAuth (`Sign in with Apple`)
- Push notifications
- TestFlight distribution

### 8.1 Set Up EAS

```bash
cd frontend

# Login to Expo account
eas login

# Initialize EAS in the project
eas build:configure
```

This creates `eas.json`. Edit it:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://learnly-ai-backend-xxxx.vercel.app"
      }
    },
    "preview": {
      "distribution": "internal"
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

### 8.2 Add EAS Secrets

```bash
# Add all your env vars as EAS secrets
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGc..."
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://learnly-ai-backend-xxxx.vercel.app"
eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_CHECKOUT_URL --value "https://..."
```

### 8.3 Build Development Client (Recommended)

A development client is a custom Expo Go with your native modules baked in. Use this for daily development once native modules matter.

```bash
# iOS development build (requires Apple Developer account)
eas build --profile development --platform ios

# Android development build
eas build --profile development --platform android
```

Build takes ~5–10 minutes. You'll get a URL to download the `.ipa` (iOS) or `.apk` (Android).

**iOS:** Install via TestFlight or direct download link
**Android:** Download the `.apk` → install directly on device

### 8.4 Run Dev Server Against Development Client

```bash
npx expo start --dev-client
```

Scan the QR code with your development client app (not Expo Go).

### 8.5 Build for TestFlight (Internal Testing)

```bash
eas build --profile preview --platform ios
```

Then submit to TestFlight:
```bash
eas submit --platform ios
```

Requires:
- Apple Developer account ($99/yr)
- App Store Connect app record created

---

## Part 9 — Backend Testing

### 9.1 Get a Test JWT

The easiest way is via the Supabase dashboard:

1. **Authentication** → **Users** → **Add user** → create a test user
2. In SQL Editor:
   ```sql
   -- Get the user ID
   select id, email from auth.users limit 5;
   ```
3. Use the Supabase JS client to sign in and get a token, or use the REST API:
   ```bash
   curl -X POST https://xxxx.supabase.co/auth/v1/token?grant_type=password \
     -H "apikey: <anon-key>" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpassword"}'
   ```
   Copy `access_token` from the response.

### 9.2 Test Each Endpoint

```bash
# Set your values
BASE=https://learnly-ai-backend-xxxx.vercel.app
TOKEN=eyJhbGc...   # from step 9.1

# ── Roadmap list (public, no auth) ────────────────────────
curl $BASE/api/roadmap
# Expected: {"roadmaps":[...3 roadmaps...]}

# ── Single roadmap with progress overlay ──────────────────
ROADMAP_ID=$(curl -s $BASE/api/roadmap | python3 -c "import sys,json; print(json.load(sys.stdin)['roadmaps'][0]['id'])")
curl -H "Authorization: Bearer $TOKEN" $BASE/api/roadmap/$ROADMAP_ID
# Expected: roadmap with nodes each having a "status" field

# ── AI Explain (cache miss then hit) ──────────────────────
curl -X POST $BASE/api/ai/explain \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"web-1","nodeTitle":"HTML Basics","nodeType":"concept","language":"en"}'
# First call: {"content":{...},"cached":false}
# Second call: {"content":{...},"cached":true}

# ── AI Quiz generation ─────────────────────────────────────
curl -X POST $BASE/api/ai/quiz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"web-1","nodeTitle":"HTML Basics","language":"en","difficulty":"beginner","count":5}'
# Expected: {"questions":[...5 questions, last one type "feynman"...],"cached":false}

# ── AI Feynman evaluation ─────────────────────────────────
curl -X POST $BASE/api/ai/feynman \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"explanation":"HTML is the skeleton of web pages. It uses tags like <h1> to structure content.","concept":"HTML","language":"en"}'
# Expected: {"score":75,"passed":true,"feedback":"...","gaps":[]}

# ── Progress summary ──────────────────────────────────────
curl -H "Authorization: Bearer $TOKEN" $BASE/api/progress
# Expected: {"activeRoadmaps":[],"streak":{...}}

# ── Rate limit: 11th call for free user returns 429 ───────
for i in {1..11}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/ai/stream \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"hi"}],"provider":"platform"}')
  echo "Call $i: HTTP $STATUS"
done
# Expected: calls 1-10 → HTTP 200, call 11 → HTTP 429

# ── Unauthorized access ───────────────────────────────────
curl $BASE/api/progress
# Expected: HTTP 401 {"error":"Unauthorized"}

# ── Subscription status ───────────────────────────────────
curl -H "Authorization: Bearer $TOKEN" $BASE/api/subscription/status
# Expected: {"tier":"free","remainingCalls":9}
```

### 9.3 Test Stripe Webhook Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe   # macOS
# Or: https://stripe.com/docs/stripe-cli#install

# Login
stripe login

# Forward webhook events to local backend
stripe listen --forward-to localhost:3000/api/subscription/webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed

# Expected: backend logs show tier updated to 'pro'
```

---

## Part 10 — Frontend Testing Checklist

Work through these on device (or simulator):

### Auth Flow
- [ ] App opens → shows onboarding (no existing session)
- [ ] Language grid shows 10 languages with flags
- [ ] Goal chips are multi-select; free text input works
- [ ] Level cards are single-select (not a slider)
- [ ] Daily time cards: 4 options, single-select
- [ ] "Continue with Email" → creates account → lands on tabs
- [ ] "Skip for now" → guest mode → lands on tabs
- [ ] Sign out → clears session → returns to onboarding

### Theme
- [ ] Default: dark theme (#0D1321 background)
- [ ] Profile → ThemeToggle → switches to light (#F0EBD8 background) instantly
- [ ] System → follows device appearance setting

### i18n
- [ ] All visible strings use translation keys (no hardcoded English)
- [ ] Switch to Hindi (हिंदी) → UI switches to Hindi text
- [ ] *(EAS dev build only)* Switch to Arabic → app reloads in RTL layout

### Offline
- [ ] Turn on airplane mode → OfflineBanner appears at top
- [ ] Offline with no cache → shows message (not spinner)
- [ ] Reconnect → OfflineBanner disappears

### Rate Limit UI
- [ ] After 7 AI calls → RateLimitBanner shows "3 remaining"
- [ ] After 9 calls → banner turns amber "1 remaining"
- [ ] After 10 calls → send button disabled, banner turns red

### Subscription Gate
- [ ] Free user taps any Pro feature → locked overlay with upgrade CTA
- [ ] "Upgrade to Pro" → opens browser to Stripe checkout

---

## Part 11 — Common Issues & Fixes

### Backend

| Issue | Cause | Fix |
|---|---|---|
| `Invalid signature` on webhook | Body parsed before `constructEvent` | Must use `req.text()` not `req.json()` — already handled |
| `401 Unauthorized` on all endpoints | JWT expired or wrong format | Get fresh token from Supabase |
| `403 Forbidden` on Pro endpoint | Free-tier user | Use a Pro test account |
| Gemini returns empty response | API key quota exceeded | Check quota at aistudio.google.com |
| Rate limit not resetting | Redis key stuck | `redis.del('rl:free:<userId>')` in Redis console |
| CORS error from app | Missing origin in headers | Check `vercel.json` CORS config |
| Edge function timeout | Response too slow | 800 max_tokens should complete in <8s on `gemini-2.0-flash` |

### Frontend

| Issue | Cause | Fix |
|---|---|---|
| Expo Go "something went wrong" | Missing env var | Check all `EXPO_PUBLIC_*` vars in `.env.local` |
| Blank white screen on start | i18n not initialized | `initI18n` must be called synchronously before render |
| Arabic doesn't flip to RTL | Testing in Expo Go | RTL requires EAS dev build |
| `dagre` import error in Metro | Package exports conflict | `resolver.unstable_enablePackageExports: false` in metro.config.js — already set |
| `Cannot find module nativewind` | Babel config order wrong | `nativewind/babel` must come AFTER expo preset — already set |
| Session not persisting on restart | AsyncStorage not configured | Check `lib/supabase.js` uses AsyncStorage |
| Apple Sign In not working | Simulator limitation | Requires physical device with Face ID |

### Supabase

| Issue | Cause | Fix |
|---|---|---|
| Profile not created on signup | Trigger not applied | Re-run `schema.sql` — trigger auto-creates profile + streak |
| RLS blocking all reads | Service role key missing | Ensure backend uses `SUPABASE_SERVICE_ROLE_KEY` |
| `unique violation` on progress | Duplicate completion attempt | Expected — `ON CONFLICT DO NOTHING` handles it |

---

## Part 12 — Environment Variables Reference

### Backend (`backend/.env.local`)

| Variable | Where to get | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase → Settings → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | ✅ |
| `UPSTASH_REDIS_REST_URL` | Upstash console → REST API | ✅ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → REST API | ✅ |
| `GEMINI_FREE_API_KEY` | Google AI Studio | ✅ |
| `GEMINI_PAID_API_KEY` | Google AI Studio | ✅ |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks | ✅ |
| `STRIPE_MONTHLY_PRICE_ID` | Stripe → Products → Prices | ✅ |
| `STRIPE_YEARLY_PRICE_ID` | Stripe → Products → Prices | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain | ✅ |

### Frontend (`frontend/.env.local`)

| Variable | Value | Required |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `EXPO_PUBLIC_API_BASE_URL` | Vercel backend URL | ✅ |
| `EXPO_PUBLIC_STRIPE_CHECKOUT_URL` | Your subscribe page URL | ✅ |
| `EXPO_PUBLIC_VOICE_ENABLED` | `false` (V1) | — |
| `EXPO_PUBLIC_SRS_ENABLED` | `false` (V1) | — |
| `EXPO_PUBLIC_COMMUNITY_ENABLED` | `false` (V1) | — |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | `false` (V1) | — |
| `EXPO_PUBLIC_GENERATION_ENABLED` | `false` (V1) | — |
| `EXPO_PUBLIC_ADAPTIVE_ENABLED` | `false` (V1) | — |

---

## Part 13 — Local Backend Development

Run the backend locally against real Supabase + Upstash:

```bash
cd backend

# Create local env file
cp .env.example .env.local
# Fill in your real values

# Start local Vercel dev server
npx vercel dev
# Backend available at: http://localhost:3000
```

Update frontend `.env.local` for local testing:
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

> **Note:** On physical device, use your machine's LAN IP instead of `localhost`:
> ```bash
> EXPO_PUBLIC_API_BASE_URL=http://192.168.1.xxx:3000
> ```
> Find your IP: `ipconfig` (Windows) or `ifconfig | grep "inet "` (Mac/Linux)

---

## Part 14 — Re-deploy After Changes

### Backend

```bash
cd backend
vercel deploy --prod
```

### Frontend (Expo Go / Dev Server)

No deployment needed — just restart the dev server:
```bash
npx expo start
```

### Frontend (EAS Build)

Only needed when you change native modules or app.json:
```bash
# Development client rebuild
eas build --profile development --platform ios

# Preview (TestFlight) rebuild
eas build --profile preview --platform ios
eas submit --platform ios
```

For JS-only changes, OTA (Over-the-Air) updates work automatically:
```bash
eas update --branch preview --message "Fix onboarding flow"
```

---

## Part 15 — Production Checklist

Before switching from test to live:

```bash
# Backend
☐ Replace sk_test_... → sk_live_... (Stripe secret key)
☐ Replace Stripe test price IDs → live price IDs
☐ Update webhook endpoint with live signing secret
☐ Set ALLOWED_ORIGINS to your actual domain
☐ Test Stripe webhook with a real card transaction ($1)

# Supabase
☐ Enable email confirmation (Authentication → Settings)
☐ Set up custom SMTP for transactional emails
☐ Review and tighten RLS policies
☐ Enable Supabase point-in-time recovery (Pro plan)
☐ Set up daily DB backups

# Gemini
☐ Set up billing on Google Cloud for paid key (remove quota limits)
☐ Monitor usage at console.cloud.google.com

# Frontend
☐ Update app.json: bundle identifier, version, build number
☐ Remove all console.log statements
☐ Test with production EAS build (not development client)
☐ Submit to App Store / Play Store

# Expo EAS
☐ Set EXPO_PUBLIC_API_BASE_URL to production Vercel domain
☐ Disable any test/debug features
☐ Run eas build --profile production --platform ios
☐ Submit for App Store review (takes 1–3 days)
```

---

## Quick Start Summary

```bash
# 1. Set up services (Supabase + Upstash + Gemini + Stripe) — see Parts 1–4

# 2. Deploy backend
cd backend && npm install
cp .env.example .env.local  # fill in values
vercel login && vercel deploy --prod

# 3. Set up Stripe webhook (Part 4.3) — needs backend URL first

# 4. Run frontend in Expo Go
cd frontend && npm install
cp .env.example .env.local  # fill in SUPABASE_URL, API_BASE_URL etc.
npx expo start              # scan QR code with Expo Go

# 5. Test backend endpoints (Part 9)
curl https://your-backend.vercel.app/api/roadmap
```

Total setup time: ~45–60 minutes for first-time setup.
