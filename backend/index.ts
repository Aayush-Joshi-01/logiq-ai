import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ── AI ────────────────────────────────────────────────────────────────────────
import streamHandler        from './handlers/ai/stream'
import outlineHandler       from './handlers/ai/outline'
import contentHandler       from './handlers/ai/content'
import explainHandler       from './handlers/ai/explain'
import quizHandler          from './handlers/ai/quiz'
import feynmanHandler       from './handlers/ai/feynman'
import quizSectionHandler   from './handlers/ai/quiz/section'
import roadmapGenHandler    from './handlers/ai/roadmap'

// ── Auth ──────────────────────────────────────────────────────────────────────
import authCallbackHandler from './handlers/auth/callback'
import authUserHandler     from './handlers/auth/user'

// ── Courses ───────────────────────────────────────────────────────────────────
import coursesHandler      from './handlers/courses/index'
import courseHandler       from './handlers/courses/[id]'

// ── Progress ──────────────────────────────────────────────────────────────────
import progressHandler      from './handlers/progress/index'
import progressNodeHandler  from './handlers/progress/node'
import progressStreakHandler from './handlers/progress/streak'

// ── Roadmaps ──────────────────────────────────────────────────────────────────
import roadmapListHandler   from './handlers/roadmap/index'
import roadmapDetailHandler from './handlers/roadmap/[id]'

// ── Subscription ──────────────────────────────────────────────────────────────
import subStatusHandler   from './handlers/subscription/status'
import subCheckoutHandler from './handlers/subscription/checkout'
import subWebhookHandler  from './handlers/subscription/webhook'

// ── Inline helpers ────────────────────────────────────────────────────────────
import { validateAuth, unauthorized } from './lib/auth'
import { supabase } from './lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────

const app = new Hono()

// CORS — applies to every route (replaces vercel.json headers section)
app.use('*', cors({
  origin:         '*',
  allowMethods:   ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders:   ['Authorization', 'Content-Type', 'X-BYOK-Key', 'X-User-Language', 'X-User-Level'],
  exposeHeaders:  ['X-RateLimit-Remaining'],
}))

// Health check — used by Railway to verify the server is up
app.get('/health', (c) => c.json({ ok: true }))

// ── AI routes ─────────────────────────────────────────────────────────────────
// All handlers check req.method internally, so .all() is correct.
app.all('/api/ai/stream',        (c) => streamHandler(c.req.raw))
app.all('/api/ai/outline',       (c) => outlineHandler(c.req.raw))
app.all('/api/ai/content',       (c) => contentHandler(c.req.raw))
app.all('/api/ai/explain',       (c) => explainHandler(c.req.raw))
app.all('/api/ai/quiz',          (c) => quizHandler(c.req.raw))
app.all('/api/ai/feynman',       (c) => feynmanHandler(c.req.raw))
app.all('/api/ai/quiz/section',  (c) => quizSectionHandler(c.req.raw))
app.all('/api/ai/roadmap',       (c) => roadmapGenHandler(c.req.raw))

// ── Auth routes ───────────────────────────────────────────────────────────────
app.all('/api/auth/callback', (c) => authCallbackHandler(c.req.raw))
app.all('/api/auth/user',     (c) => authUserHandler(c.req.raw))

// ── Course routes ─────────────────────────────────────────────────────────────
app.all('/api/courses',     (c) => coursesHandler(c.req.raw))
app.all('/api/courses/:id', (c) => courseHandler(c.req.raw))

// ── Progress routes ───────────────────────────────────────────────────────────
app.all('/api/progress',        (c) => progressHandler(c.req.raw))
app.all('/api/progress/node',   (c) => progressNodeHandler(c.req.raw))
app.all('/api/progress/streak', (c) => progressStreakHandler(c.req.raw))

// ── Roadmap routes ────────────────────────────────────────────────────────────
app.all('/api/roadmap', (c) => roadmapListHandler(c.req.raw))

// Enroll must be registered before :id so Hono doesn't match "enroll" as an id
app.post('/api/roadmap/:id/enroll', async (c) => {
  const roadmapId = c.req.param('id')
  const { user }  = await validateAuth(c.req.raw)
  if (!user) return unauthorized()

  await supabase.from('user_roadmaps').upsert({
    user_id:    user.id,
    roadmap_id: roadmapId,
    status:     'active',
  }, { onConflict: 'user_id,roadmap_id', ignoreDuplicates: true })

  return c.json({ enrolled: true })
})

app.all('/api/roadmap/:id', (c) => roadmapDetailHandler(c.req.raw))

// ── Subscription routes ───────────────────────────────────────────────────────
app.all('/api/subscription/status',   (c) => subStatusHandler(c.req.raw))
app.all('/api/subscription/checkout', (c) => subCheckoutHandler(c.req.raw))
app.all('/api/subscription/webhook',  (c) => subWebhookHandler(c.req.raw))

// ─────────────────────────────────────────────────────────────────────────────

// Bun native server — Railway injects $PORT automatically
export default {
  port:  Number(process.env.PORT) || 3000,
  fetch: app.fetch,
}
