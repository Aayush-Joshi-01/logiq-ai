# AI Learning Platform — Backend Specification (V1 + V2)
> Stack: Vercel (Edge Functions + Serverless) + Supabase (Auth + Postgres) + Upstash Redis
> Language: TypeScript throughout
> Deploy: Vercel free tier — AI endpoints on Edge Runtime, CRUD on Serverless
> Payments: Stripe (web checkout only — no mobile SDK, no in-app purchase)
> Theme tokens for API responses: Dusty Denim #748CAB, Ink Black #0D1321, Eggshell #F0EBD8

---

## Feature Scope

### V1 — Core Backend
| Endpoint Group | Features |
|---|---|
| Auth | Supabase JWT validation, user profile CRUD |
| AI Stream | Streaming chat proxy, rate limiting, BYOK (OpenAI) |
| AI Explain | Node explanation generation + 30-day cache |
| AI Quiz | Quiz question generation + 7-day cache |
| AI Feynman | Feynman explanation grading |
| Progress | Node completion, roadmap enrollment, streak |
| Roadmaps | List + single roadmap with user progress overlay |
| Subscription | Stripe checkout, webhook, status check |

### V2 — Extended Backend
| Endpoint Group | Features |
|---|---|
| AI Roadmap Gen | 2-stage pipeline: scope extract → graph generate (pro) |
| AI Voice | Whisper transcription proxy, TTS proxy |
| AI Adaptive | Behavior-based difficulty inference |
| AI Local Context | Culturally relevant example generation per locale |
| SRS | SM-2 queue, review submission, next-date calculation |
| Community | Node Q&A: post, upvote, AI summary |
| Analytics | Skill radar, time heatmap, weak area detection |
| BYOK Multi-Provider | Gemini + Claude + Azure provider adapters |
| Org/Team | Team creation, shared roadmaps, member progress |
| Webhooks | Roadmap share events, team invites |

---

## 1. Project Structure

```
/backend
  /api
    /auth
      callback.ts          ← Supabase OAuth callback
      user.ts              ← GET/PATCH current user profile

    /ai
      stream.ts            ← POST stream AI response          [Edge]
      explain.ts           ← POST generate/cache explanation   [Serverless]
      quiz.ts              ← POST generate/cache quiz          [Serverless]
      feynman.ts           ← POST evaluate Feynman response    [Serverless]
      roadmap.ts           ← POST generate roadmap (V2, pro)   [Serverless]
      voice.ts             ← POST Whisper transcription (V2)   [Serverless]
      adaptive.ts          ← POST infer difficulty level (V2)  [Serverless]
      localize.ts          ← POST locale-relevant examples (V2)[Serverless]

    /progress
      index.ts             ← GET user progress summary
      node.ts              ← PATCH mark node complete/skip
      streak.ts            ← GET streak + POST update

    /roadmap
      index.ts             ← GET roadmap list (curated + generated)
      [id].ts              ← GET single roadmap + user progress overlay

    /subscription
      checkout.ts          ← POST create Stripe checkout session
      webhook.ts           ← POST Stripe webhook handler
      status.ts            ← GET user entitlement check

    /srs                   ← V2
      queue.ts             ← GET today's review queue
      review.ts            ← POST submit SM-2 review result

    /community             ← V2
      [nodeId].ts          ← GET questions + POST new question
      vote.ts              ← POST upvote question/answer
      summary.ts           ← GET AI-summarized top answers

    /analytics             ← V2
      radar.ts             ← GET skill radar data
      heatmap.ts           ← GET learning activity heatmap
      weakareas.ts         ← GET weak topic detection

    /team                  ← V2
      index.ts             ← GET/POST team management
      members.ts           ← GET/POST/DELETE team members
      progress.ts          ← GET team learning progress

  /lib
    supabase.ts            ← Supabase admin client
    redis.ts               ← Upstash Redis client
    ratelimit.ts           ← Sliding window rate limiter
    auth.ts                ← JWT validation helper
    cache.ts               ← AI response cache (Supabase ai_cache table)
    srs.ts                 ← SM-2 algorithm
    providers/
      index.ts             ← Provider router
      openai.ts            ← V1
      gemini.ts            ← V2
      claude.ts            ← V2
      azure.ts             ← V2
    prompts.ts             ← All system prompt builders

  /middleware
    withAuth.ts            ← Validates Supabase JWT
    withRateLimit.ts       ← Redis rate limit check
    withSubscription.ts    ← Tier check (free/pro)

  /types
    index.ts
    roadmap.ts
    user.ts
    ai.ts
    srs.ts                 ← V2

  vercel.json
  .env.local
```

---

## 2. Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=           ← Never expose to client

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# AI — Platform keys (free + pro tier)
OPENAI_API_KEY=
GEMINI_API_KEY=                      ← V2
ANTHROPIC_API_KEY=                   ← V2

# Stripe
STRIPE_SECRET_KEY=                   ← sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=               ← whsec_...
STRIPE_MONTHLY_PRICE_ID=             ← price_...
STRIPE_YEARLY_PRICE_ID=              ← price_...

# App
NEXT_PUBLIC_APP_URL=https://yourapp.com
ALLOWED_ORIGINS=https://yourapp.com

# V2 Feature flags
COMMUNITY_ENABLED=false
ANALYTICS_ENABLED=false
VOICE_ENABLED=false
ROADMAP_GENERATION_ENABLED=false
```

---

## 3. Database Schema (Supabase / Postgres)

```sql
-- Extends Supabase auth.users
create table public.profiles (
  id                     uuid references auth.users(id) primary key,
  display_name           text,
  language               text default 'en',
  subscription_tier      text default 'free',   -- 'free' | 'pro'
  stripe_customer_id     text,
  stripe_subscription_id text,
  inferred_level         text default 'beginner', -- V2: adaptive difficulty
  preferred_style        text default 'auto',     -- V2: explanation style
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Curated + AI-generated roadmaps
create table public.roadmaps (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  category         text,
  difficulty       text,
  is_generated     boolean default false,
  nodes            jsonb not null,
  edges            jsonb not null,
  estimated_weeks  int,
  language         text default 'en',
  created_by       uuid references public.profiles(id),
  is_public        boolean default true,
  created_at       timestamptz default now()
);

-- User enrollments with progress JSONB
create table public.user_roadmaps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  roadmap_id   uuid references public.roadmaps(id) on delete cascade,
  status       text default 'active',  -- 'active' | 'paused' | 'completed'
  progress     jsonb default '{}',
  -- progress shape: { nodeId: { status, completedAt, quizScore, feynmanScore } }
  started_at   timestamptz default now(),
  completed_at timestamptz,
  unique(user_id, roadmap_id)
);

-- Granular node completions for analytics + SRS seeding
create table public.node_completions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references public.profiles(id) on delete cascade,
  roadmap_id           uuid references public.roadmaps(id) on delete cascade,
  node_id              text not null,
  quiz_score           int,       -- 0–100
  feynman_score        int,       -- 0–100, AI-graded
  time_spent_minutes   int,
  difficulty_at_time   text,      -- V2: inferred level when completed
  completed_at         timestamptz default now()
);

-- V2: SRS entries (one per user per node)
create table public.srs_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade,
  node_id          text not null,
  roadmap_id       uuid references public.roadmaps(id),
  interval_days    int default 1,
  ease_factor      float default 2.5,
  repetitions      int default 0,
  next_review_at   timestamptz default now(),
  last_reviewed_at timestamptz,
  created_at       timestamptz default now()
);

-- AI response cache (saves cost on repeated requests)
create table public.ai_cache (
  id          uuid primary key default gen_random_uuid(),
  cache_key   text unique not null,   -- hash(nodeId + language + type)
  content     text not null,
  tokens_used int,
  provider    text,
  created_at  timestamptz default now(),
  expires_at  timestamptz default now() + interval '30 days'
);

-- User streaks
create table public.streaks (
  user_id          uuid references public.profiles(id) primary key,
  current_streak   int default 0,
  longest_streak   int default 0,
  last_active_date date,
  total_xp         int default 0,
  updated_at       timestamptz default now()
);

-- V2: Community Q&A per node
create table public.node_questions (
  id          uuid primary key default gen_random_uuid(),
  node_id     text not null,
  roadmap_id  uuid references public.roadmaps(id),
  user_id     uuid references public.profiles(id),
  body        text not null,
  upvotes     int default 0,
  ai_summary  text,   -- cached AI summary of top answers
  created_at  timestamptz default now()
);

create table public.node_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid references public.node_questions(id) on delete cascade,
  user_id     uuid references public.profiles(id),
  body        text not null,
  upvotes     int default 0,
  created_at  timestamptz default now()
);

-- V2: Teams
create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.team_members (
  team_id    uuid references public.teams(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  role       text default 'member',  -- 'owner' | 'admin' | 'member'
  joined_at  timestamptz default now(),
  primary key (team_id, user_id)
);

-- Indexes
create index idx_user_roadmaps_user   on public.user_roadmaps(user_id);
create index idx_node_completions_user on public.node_completions(user_id);
create index idx_srs_next_review       on public.srs_entries(user_id, next_review_at);
create index idx_ai_cache_key          on public.ai_cache(cache_key);
create index idx_node_questions_node   on public.node_questions(node_id);

-- Row Level Security
alter table public.profiles        enable row level security;
alter table public.user_roadmaps   enable row level security;
alter table public.node_completions enable row level security;
alter table public.srs_entries     enable row level security;
alter table public.streaks         enable row level security;
alter table public.node_questions  enable row level security;
alter table public.node_answers    enable row level security;

create policy "own data" on public.profiles
  for all using (auth.uid() = id);
create policy "own data" on public.user_roadmaps
  for all using (auth.uid() = user_id);
create policy "own data" on public.node_completions
  for all using (auth.uid() = user_id);
create policy "own data" on public.srs_entries
  for all using (auth.uid() = user_id);
create policy "own data" on public.streaks
  for all using (auth.uid() = user_id);
create policy "public read" on public.roadmaps
  for select using (is_public = true);
create policy "public read questions" on public.node_questions
  for select using (true);
create policy "own questions" on public.node_questions
  for insert using (auth.uid() = user_id);
```

---

## 4. Middleware

```typescript
// middleware/withAuth.ts
import { createClient } from '@supabase/supabase-js'

export async function validateAuth(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return { user: null, error: 'No token' }
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return { user, error: error?.message }
}
```

```typescript
// middleware/withRateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const limiters = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '24h'),
    prefix: 'rl:free'
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(500, '24h'),
    prefix: 'rl:pro'
  })
}

export async function checkRateLimit(userId: string, tier: 'free' | 'pro') {
  const { success, remaining, reset } = await limiters[tier].limit(userId)
  return { allowed: success, remaining, reset }
}
```

```typescript
// middleware/withSubscription.ts
export async function getSubscriptionTier(userId: string, supabase: any) {
  // Check Redis cache first (5min TTL) to avoid DB hit on every request
  const cached = await redis.get(`tier:${userId}`)
  if (cached) return cached as 'free' | 'pro'

  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  const tier = (data?.subscription_tier || 'free') as 'free' | 'pro'
  await redis.set(`tier:${userId}`, tier, { ex: 300 })  // 5min TTL
  return tier
}
```

---

## 5. Core API Endpoints

### 5.1 AI Stream — V1 [Edge Runtime]

```typescript
// api/ai/stream.ts
export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { user, error } = await validateAuth(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages, provider, nodeId, roadmapContext } = await req.json()

  const tier = await getSubscriptionTier(user.id)
  const { allowed, remaining } = await checkRateLimit(user.id, tier)
  if (!allowed) {
    return new Response(JSON.stringify({
      error: 'Daily limit reached',
      remaining: 0,
      upgradeUrl: '/subscription'
    }), { status: 429 })
  }

  // Resolve API key: BYOK header takes precedence over platform key
  const byokKey = req.headers.get('X-BYOK-Key')
  const apiKey = byokKey || getProviderKey(provider)

  const systemPrompt = buildTutorPrompt({
    nodeId,
    roadmapContext,
    userLanguage: req.headers.get('X-User-Language') || 'en',
    userLevel:    req.headers.get('X-User-Level') || 'beginner',
  })

  const stream = await streamFromProvider({
    provider: provider || 'openai',
    apiKey,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'X-RateLimit-Remaining': remaining.toString(),
      'Cache-Control': 'no-cache',
    }
  })
}
```

### 5.2 Provider Router — V1 + V2

```typescript
// lib/providers/index.ts
export async function streamFromProvider({ provider, apiKey, messages }) {
  switch (provider) {
    case 'openai':  return streamOpenAI(apiKey, messages)   // V1
    case 'gemini':  return streamGemini(apiKey, messages)   // V2
    case 'claude':  return streamClaude(apiKey, messages)   // V2
    case 'azure':   return streamAzure(apiKey, messages)    // V2
    default:        return streamOpenAI(process.env.OPENAI_API_KEY!, messages)
  }
}

// lib/providers/openai.ts — V1
export async function streamOpenAI(apiKey: string, messages: any[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',   // default free; upgrade to gpt-4o for pro
      messages,
      stream: true,
      max_tokens: 800,
      temperature: 0.7,
    })
  })
  return res.body
}

// lib/providers/gemini.ts — V2
export async function streamGemini(apiKey: string, messages: any[]) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  const systemInstruction = messages.find(m => m.role === 'system')?.content

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction }] }
          : undefined,
        generationConfig: { maxOutputTokens: 800 }
      })
    }
  )
  return transformGeminiStream(res.body)  // normalize to OpenAI SSE format
}

// lib/providers/claude.ts — V2
export async function streamClaude(apiKey: string, messages: any[]) {
  const system = messages.find(m => m.role === 'system')?.content
  const filtered = messages.filter(m => m.role !== 'system')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system,
      messages: filtered,
      stream: true,
    })
  })
  return transformClaudeStream(res.body)
}
```

### 5.3 AI Explanation Cache — V1

```typescript
// api/ai/explain.ts
export default async function handler(req: Request) {
  const { user } = await validateAuth(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { nodeId, language, type } = await req.json()
  const cacheKey = `explain:${nodeId}:${language}:${type}`

  // Check cache
  const { data: cached } = await supabase
    .from('ai_cache')
    .select('content')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (cached) return Response.json({ content: cached.content, cached: true })

  // Generate
  const content = await generateExplanation(nodeId, language, type)

  await supabase.from('ai_cache').upsert({
    cache_key: cacheKey,
    content,
    provider: 'openai',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  })

  return Response.json({ content, cached: false })
}
```

### 5.4 Feynman Evaluation — V1

```typescript
// api/ai/feynman.ts
export default async function handler(req: Request) {
  const { user } = await validateAuth(req)
  const { explanation, concept, language } = await req.json()

  const prompt = `Evaluate this explanation of "${concept}".
Return ONLY valid JSON, no markdown:
{
  "score": number,
  "passed": boolean,
  "feedback": string,
  "gaps": string[]
}

Scoring (0-100):
  Accuracy    40pts — factually correct?
  Simplicity  30pts — could a non-expert understand?
  Completeness 30pts — covers the key idea?

passed = score >= 70
feedback = 1-2 sentences in ${language}
gaps = concepts they missed, in ${language}

Student explanation: "${explanation}"`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })

  return Response.json(JSON.parse(res.choices[0].message.content!))
}
```

### 5.5 Progress: Mark Node Complete — V1

```typescript
// api/progress/node.ts
export default async function handler(req: Request) {
  const { user } = await validateAuth(req)
  const { roadmapId, nodeId, quizScore, feynmanScore, timeSpentMinutes } = await req.json()

  // 1. Insert completion record
  await supabase.from('node_completions').insert({
    user_id: user.id, roadmap_id: roadmapId, node_id: nodeId,
    quiz_score: quizScore, feynman_score: feynmanScore,
    time_spent_minutes: timeSpentMinutes
  })

  // 2. Update progress JSONB on user_roadmaps
  const { data: ur } = await supabase
    .from('user_roadmaps').select('progress')
    .eq('user_id', user.id).eq('roadmap_id', roadmapId).single()

  const updatedProgress = {
    ...ur.progress,
    [nodeId]: { status: 'completed', completedAt: new Date().toISOString(), quizScore }
  }

  await supabase.from('user_roadmaps')
    .update({ progress: updatedProgress })
    .eq('user_id', user.id).eq('roadmap_id', roadmapId)

  // 3. Update streak
  await updateStreak(user.id)

  // 4. Unlock next nodes (derived from roadmap edges)
  const unlockedNodes = await unlockNextNodes(roadmapId, nodeId, user.id)

  // 5. Seed SRS entry (V2 — no-op if SRS not enabled)
  if (process.env.SRS_ENABLED === 'true') {
    await supabase.from('srs_entries').upsert({
      user_id: user.id, node_id: nodeId, roadmap_id: roadmapId,
      next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }

  return Response.json({ success: true, unlockedNodes })
}
```

### 5.6 Stripe Checkout + Webhook — V1

```typescript
// api/subscription/checkout.ts
// Called by YOUR WEBSITE when user taps "Subscribe on our website"
// App calls Linking.openURL → website → this endpoint → Stripe

import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export default async function handler(req: Request) {
  const { userId, plan } = await req.json()
  const priceId = plan === 'yearly'
    ? process.env.STRIPE_YEARLY_PRICE_ID!
    : process.env.STRIPE_MONTHLY_PRICE_ID!

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/cancel`,
  })

  return Response.json({ url: session.url })
}
```

```typescript
// api/subscription/webhook.ts
export default async function handler(req: Request) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.CheckoutSession
      if (s.metadata?.userId) {
        await supabase.from('profiles').update({
          subscription_tier: 'pro',
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: s.subscription as string,
        }).eq('id', s.metadata.userId)
        await redis.del(`tier:${s.metadata.userId}`)  // bust tier cache
      }
      break
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice
      await supabase.from('profiles')
        .update({ subscription_tier: 'pro' })
        .eq('stripe_customer_id', inv.customer as string)
      break
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const obj = event.data.object as any
      const { data } = await supabase.from('profiles')
        .select('id').eq('stripe_customer_id', obj.customer).single()
      if (data) {
        await supabase.from('profiles')
          .update({ subscription_tier: 'free' })
          .eq('id', data.id)
        await redis.del(`tier:${data.id}`)
      }
      break
    }
  }

  return new Response('OK', { status: 200 })
}
```

---

## 6. V2 Endpoints

### 6.1 AI Roadmap Generation — V2 (Pro Only)

```typescript
// api/ai/roadmap.ts
export default async function handler(req: Request) {
  const { user } = await validateAuth(req)
  const tier = await getSubscriptionTier(user.id)
  if (tier !== 'pro') return Response.json({ error: 'Pro required' }, { status: 403 })

  const { goal, priorKnowledge, availableWeeks, dailyMinutes, language } = await req.json()

  // Stage 1: Extract structured scope
  const scope = await extractScope({ goal, priorKnowledge, availableWeeks, dailyMinutes })

  // Stage 2: Generate node graph
  const graph = await generateGraph(scope, language)

  // Save + enroll
  const { data: roadmap } = await supabase.from('roadmaps').insert({
    title: graph.title, description: graph.description,
    nodes: graph.nodes, edges: graph.edges,
    is_generated: true, created_by: user.id,
    is_public: false, language, estimated_weeks: availableWeeks
  }).select().single()

  await supabase.from('user_roadmaps').insert({ user_id: user.id, roadmap_id: roadmap.id })

  return Response.json({ roadmap })
}

async function extractScope(input: any) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: `Extract learning parameters. Return ONLY valid JSON:
{
  "goal": string,
  "priorKnowledge": string[],
  "availableWeeks": number,
  "dailyMinutes": number,
  "topicArea": string,
  "suggestedTitle": string
}
Input: ${JSON.stringify(input)}` }],
    response_format: { type: 'json_object' }
  })
  return JSON.parse(res.choices[0].message.content!)
}

async function generateGraph(scope: any, language: string) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: `Generate a learning roadmap as a directed graph.
Return ONLY valid JSON:
{
  "title": string,
  "description": string,
  "nodes": [{ "id": string, "title": string, "type": "concept|project|assessment|milestone", "estimated_minutes": number, "week": number }],
  "edges": [{ "source": string, "target": string }]
}
Rules:
- Max 20 nodes for ${scope.availableWeeks} weeks
- No circular dependencies
- Titles in ${language}
- Every node reachable from first node
Scope: ${JSON.stringify(scope)}` }],
    response_format: { type: 'json_object' }
  })
  return JSON.parse(res.choices[0].message.content!)
}
```

### 6.2 SRS Queue + Review — V2

```typescript
// api/srs/queue.ts
export default async function handler(req: Request) {
  const { user } = await validateAuth(req)

  const { data: entries } = await supabase
    .from('srs_entries')
    .select('id, node_id, roadmap_id, interval_days, ease_factor, repetitions, roadmaps(nodes)')
    .eq('user_id', user.id)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(10)

  const queue = entries?.map(e => {
    const node = (e.roadmaps as any)?.nodes?.find((n: any) => n.id === e.node_id)
    return { ...e, nodeTitle: node?.title, nodeType: node?.type }
  }) || []

  return Response.json({ queue, count: queue.length })
}
```

```typescript
// api/srs/review.ts — SM-2 algorithm
export default async function handler(req: Request) {
  const { user } = await validateAuth(req)
  const { entryId, quality } = await req.json()  // quality: 0–5

  const { data: entry } = await supabase
    .from('srs_entries').select('*').eq('id', entryId).single()

  const { newInterval, newEaseFactor, newRepetitions } = sm2({
    quality,
    interval:    entry.interval_days,
    easeFactor:  entry.ease_factor,
    repetitions: entry.repetitions,
  })

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)

  await supabase.from('srs_entries').update({
    interval_days:    newInterval,
    ease_factor:      newEaseFactor,
    repetitions:      newRepetitions,
    next_review_at:   nextReview.toISOString(),
    last_reviewed_at: new Date().toISOString(),
  }).eq('id', entryId)

  return Response.json({ nextReviewDate: nextReview })
}

// lib/srs.ts
export function sm2({ quality, interval, easeFactor, repetitions }: {
  quality: number, interval: number, easeFactor: number, repetitions: number
}) {
  if (quality < 3) return { newInterval: 1, newEaseFactor: easeFactor, newRepetitions: 0 }

  const newEaseFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )
  let newInterval: number
  if (repetitions === 0)      newInterval = 1
  else if (repetitions === 1) newInterval = 6
  else                        newInterval = Math.round(interval * newEaseFactor)

  return { newInterval, newEaseFactor, newRepetitions: repetitions + 1 }
}
```

### 6.3 Voice — V2

```typescript
// api/ai/voice.ts — Whisper transcription proxy
export default async function handler(req: Request) {
  const { user } = await validateAuth(req)
  const tier = await getSubscriptionTier(user.id)
  if (tier !== 'pro') return Response.json({ error: 'Pro required' }, { status: 403 })

  const formData = await req.formData()
  const audio = formData.get('audio') as File

  const openaiForm = new FormData()
  openaiForm.append('file', audio)
  openaiForm.append('model', 'whisper-1')
  openaiForm.append('language', req.headers.get('X-User-Language') || 'en')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: openaiForm,
  })

  const { text } = await res.json()
  return Response.json({ transcript: text })
}
```

### 6.4 Adaptive Difficulty — V2

```typescript
// api/ai/adaptive.ts
// Infers user level from behavior — never from self-report
export default async function handler(req: Request) {
  const { user } = await validateAuth(req)

  // Pull last 10 completions with scores
  const { data: completions } = await supabase
    .from('node_completions')
    .select('quiz_score, feynman_score, time_spent_minutes')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(10)

  if (!completions || completions.length < 3) {
    return Response.json({ level: 'beginner', confidence: 'low' })
  }

  const avgQuiz    = completions.reduce((s, c) => s + (c.quiz_score || 0), 0) / completions.length
  const avgFeynman = completions.reduce((s, c) => s + (c.feynman_score || 0), 0) / completions.length
  const avgTime    = completions.reduce((s, c) => s + (c.time_spent_minutes || 0), 0) / completions.length

  let level: string
  if (avgQuiz >= 85 && avgFeynman >= 80)       level = 'advanced'
  else if (avgQuiz >= 70 && avgFeynman >= 65)  level = 'intermediate'
  else                                          level = 'beginner'

  // Update profile
  await supabase.from('profiles')
    .update({ inferred_level: level })
    .eq('id', user.id)

  return Response.json({ level, confidence: 'high', avgQuiz, avgFeynman, avgTime })
}
```

### 6.5 Community Q&A — V2

```typescript
// api/community/[nodeId].ts
export default async function handler(req: Request) {
  const nodeId = req.url.split('/').pop()!

  if (req.method === 'GET') {
    const { data } = await supabase
      .from('node_questions')
      .select('*, node_answers(*, profiles(display_name))')
      .eq('node_id', nodeId)
      .order('upvotes', { ascending: false })
      .limit(20)
    return Response.json({ questions: data })
  }

  if (req.method === 'POST') {
    const { user } = await validateAuth(req)
    if (!user) return new Response('Unauthorized', { status: 401 })
    const { body, roadmapId } = await req.json()
    const { data } = await supabase.from('node_questions').insert({
      node_id: nodeId, roadmap_id: roadmapId,
      user_id: user.id, body
    }).select().single()
    return Response.json({ question: data })
  }
}
```

---

## 7. AI Prompt Architecture

```typescript
// lib/prompts.ts

export function buildTutorPrompt({ nodeId, roadmapContext, userLanguage, userLevel, sessionHistory }: any) {
  return `You are an expert learning tutor. Help the user understand concepts clearly.

RULES:
- Always respond in ${userLanguage}
- Adapt explanation depth to ${userLevel} level
- Keep responses under 200 words unless the user asks for more
- Use culturally relevant examples for ${userLanguage} speakers when possible
- If the user says "I don't understand" twice in a row, switch to a simpler analogy
- Never give exercise answers directly — guide with hints only

CURRENT CONTEXT:
- Roadmap: ${roadmapContext?.roadmapTitle}
- Current node: ${roadmapContext?.nodeTitle} (${roadmapContext?.nodeType})
- Progress: ${roadmapContext?.completedNodes}/${roadmapContext?.totalNodes} nodes done

${sessionHistory ? `RECENT SESSION SUMMARY:\n${sessionHistory}` : ''}

Respond conversationally. Minimal markdown — this is a mobile chat interface.`
}

export function buildFeynmanPrompt({ concept, language }: any) {
  return `Evaluate this student's explanation of "${concept}".
Return ONLY valid JSON, no markdown:
{
  "score": number,
  "passed": boolean,
  "feedback": string,
  "gaps": string[]
}
Scoring: Accuracy 40pts + Simplicity 30pts + Completeness 30pts.
passed = score >= 70.
feedback = 1-2 sentences in ${language}.
gaps = missed concepts in ${language}.`
}

export function buildQuizPrompt({ nodeTitle, nodeContent, language, difficulty, count = 5 }: any) {
  return `Generate ${count} quiz questions for the topic: "${nodeTitle}".
Return ONLY valid JSON:
{
  "questions": [
    {
      "type": "mcq" | "fill_blank" | "feynman",
      "question": string,
      "options": string[] | null,
      "correct": string | null,
      "explanation": string
    }
  ]
}
Rules:
- Last question MUST be type "feynman"
- All text in ${language}
- Difficulty: ${difficulty}
- Options only for mcq type (4 options)
- Explanations in ${language}
Node content summary: ${nodeContent}`
}

// V2: Local context example generation
export function buildLocalContextPrompt({ concept, language, locale }: any) {
  const localExamples: Record<string, string> = {
    'hi': 'Indian tech companies like Flipkart, Zomato, or IRCTC',
    'ar': 'regional platforms like Noon, Careem, or government services',
    'es': 'Latin American companies like Mercado Libre or Rappi',
    'en': 'everyday examples like Amazon, Uber, or Netflix',
  }
  const context = localExamples[locale] || localExamples['en']

  return `Rewrite this concept explanation using examples from ${context}.
Keep the technical accuracy identical. Only change the example context.
Concept: ${concept}
Output the rewritten explanation in ${language} only. No preamble.`
}
```

---

## 8. Caching Strategy

```
Supabase ai_cache table:
  Node explanations:     30 days  — same node + language = same content
  Quiz questions:         7 days  — regenerate weekly for freshness
  Community AI summaries: 1 day   — refresh as new answers come in

Redis (Upstash):
  Rate limit counters:   24h TTL
  Subscription tier:      5min TTL — avoid DB hit per request
  Session summaries:      2h TTL  — last 3 session summaries per user

Cache key format:
  explain:{nodeId}:{language}:{type}
  quiz:{nodeId}:{language}:{difficulty}
  session:{userId}:summary
  tier:{userId}

Target cache hit rate: >60% on explain + quiz endpoints.
Below this, AI costs become unpredictable at scale.
```

---

## 9. Model Tiering

```
Free tier:
  AI tutor:      gpt-4o-mini (cheap, fast, good enough)
  Explanations:  gpt-4o-mini (cached, so cost amortized)
  Feynman eval:  gpt-4o-mini
  Quiz gen:      gpt-4o-mini

Pro tier:
  AI tutor:      gpt-4o (better reasoning, longer context)
  Explanations:  gpt-4o-mini (still cached, no need for 4o)
  Roadmap gen:   gpt-4o (V2 — complex graph generation needs it)
  Voice (V2):    whisper-1 (fixed cost per minute)

BYOK:
  User supplies key → their model choice, their cost
  Backend still enforces max_tokens: 800 per request
  to prevent abuse even with user keys
```

---

## 10. vercel.json

```json
{
  "functions": {
    "api/ai/stream.ts": { "runtime": "edge" },
    "api/ai/*.ts":       { "maxDuration": 30 },
    "api/subscription/webhook.ts": { "maxDuration": 10 }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin",  "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PATCH, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Authorization, Content-Type, X-BYOK-Key, X-User-Language, X-User-Level" }
      ]
    }
  ]
}
```

---

## 11. Security Checklist

```
V1:
✓ All AI endpoints require valid Supabase JWT
✓ Rate limiting on every AI endpoint (Redis sliding window)
✓ BYOK keys never logged, never stored server-side
✓ Subscription tier verified server-side — never trusted from client
✓ Stripe webhook signature verified (stripe.webhooks.constructEvent)
✓ stripe_customer_id used to match webhooks — not userId from metadata alone
✓ Tier cache busted immediately on Stripe webhook (redis.del)
✓ Supabase RLS enabled on all user tables
✓ SUPABASE_SERVICE_ROLE_KEY server-side only — never in app
✓ Max tokens enforced per request — prevents prompt injection cost abuse
✓ CORS locked to app domain in production
✓ No payment UI in mobile app — Apple 3.1.1 compliant

V2 additions:
✓ Voice endpoint (Whisper) gated behind pro subscription
✓ Roadmap generation gated behind pro — checked in API, not just UI
✓ Community posts rate-limited separately (Ratelimit.fixedWindow(5, '1h'))
✓ Team endpoints check membership before returning data
✓ BYOK multi-provider: validate key format before forwarding
```

---

## 12. Deployment Steps

```bash
# 1. Install CLI
npm install -g vercel
npm install stripe @upstash/ratelimit @upstash/redis

# 2. Deploy
vercel login && vercel link && vercel deploy --prod

# 3. Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add OPENAI_API_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_MONTHLY_PRICE_ID
vercel env add STRIPE_YEARLY_PRICE_ID

# 4. Supabase setup
# Run schema SQL in Supabase SQL editor (Section 3)
# Enable RLS on all tables
# Configure OAuth: Google + Apple (Settings → Auth → Providers)
# Set redirect URL: https://yourapp.vercel.app/api/auth/callback

# 5. Upstash
# Create Redis DB at console.upstash.com
# Copy REST URL + token

# 6. Stripe
# Create product + 2 prices (monthly/yearly) in Stripe dashboard
# Add webhook: https://yourapp.vercel.app/api/subscription/webhook
# Subscribe to: checkout.session.completed, invoice.paid,
#   customer.subscription.deleted, invoice.payment_failed
# Copy signing secret → STRIPE_WEBHOOK_SECRET
```

---

## 13. V1 Endpoint Summary

| Method | Endpoint | Auth | Tier | Runtime |
|--------|----------|------|------|---------|
| POST | /api/ai/stream | ✓ | Free+Pro | Edge |
| POST | /api/ai/explain | ✓ | Free+Pro | Serverless |
| POST | /api/ai/quiz | ✓ | Free+Pro | Serverless |
| POST | /api/ai/feynman | ✓ | Free+Pro | Serverless |
| GET | /api/progress | ✓ | All | Serverless |
| PATCH | /api/progress/node | ✓ | All | Serverless |
| GET | /api/progress/streak | ✓ | All | Serverless |
| GET | /api/roadmap | Public | — | Serverless |
| GET | /api/roadmap/[id] | ✓ | All | Serverless |
| POST | /api/subscription/checkout | Public | — | Serverless |
| POST | /api/subscription/webhook | Stripe-signed | — | Serverless |
| GET | /api/subscription/status | ✓ | All | Serverless |
| GET | /api/auth/user | ✓ | All | Serverless |

## 14. V2 Endpoint Summary

| Method | Endpoint | Auth | Tier | Runtime |
|--------|----------|------|------|---------|
| POST | /api/ai/roadmap | ✓ | Pro only | Serverless |
| POST | /api/ai/voice | ✓ | Pro only | Serverless |
| POST | /api/ai/adaptive | ✓ | Free+Pro | Serverless |
| POST | /api/ai/localize | ✓ | Free+Pro | Serverless |
| GET | /api/srs/queue | ✓ | Free+Pro | Serverless |
| POST | /api/srs/review | ✓ | Free+Pro | Serverless |
| GET/POST | /api/community/[nodeId] | ✓/Public | All | Serverless |
| POST | /api/community/vote | ✓ | All | Serverless |
| GET | /api/analytics/radar | ✓ | Pro | Serverless |
| GET | /api/analytics/heatmap | ✓ | Pro | Serverless |
| GET | /api/analytics/weakareas | ✓ | Pro | Serverless |
| GET/POST | /api/team | ✓ | Pro | Serverless |
| GET/POST/DELETE | /api/team/members | ✓ | Pro | Serverless |
| GET | /api/team/progress | ✓ | Pro | Serverless |
