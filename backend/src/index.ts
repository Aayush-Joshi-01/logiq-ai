import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// ─── Handlers ─────────────────────────────────────────────────────────────────
import roadmapIndex    from '../api/roadmap/index'
import roadmapId       from '../api/roadmap/[id]'
import authUser        from '../api/auth/user'
import authCallback    from '../api/auth/callback'
import progressIndex   from '../api/progress/index'
import progressNode    from '../api/progress/node'
import progressStreak  from '../api/progress/streak'
import aiStream        from '../api/ai/stream'
import aiOutline       from '../api/ai/outline'
import aiContent       from '../api/ai/content'
import aiExplain       from '../api/ai/explain'
import aiQuiz          from '../api/ai/quiz'
import aiFeynman       from '../api/ai/feynman'
import aiQuizSection   from '../api/ai/quiz/section'
import coursesIndex    from '../api/courses/index'
import coursesId       from '../api/courses/[id]'
import subStatus       from '../api/subscription/status'
import subCheckout     from '../api/subscription/checkout'
import subWebhook      from '../api/subscription/webhook'

// ─── Lib (for inline enroll handler) ─────────────────────────────────────────
import { validateAuth, unauthorized } from '../lib/auth'
import { supabase }                   from '../lib/supabase'

// ─── App ──────────────────────────────────────────────────────────────────────
const app = new Hono()

app.use('*', logger())

app.use('*', cors({
  origin:         '*',
  allowMethods:   ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders:   ['Authorization', 'Content-Type', 'X-BYOK-Key', 'X-User-Language', 'X-User-Level'],
  exposeHeaders:  ['X-RateLimit-Remaining'],
}))

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ ok: true }))

// ─── Roadmap ─────────────────────────────────────────────────────────────────
app.all('/api/roadmap',     (c) => roadmapIndex(c.req.raw))

// Enroll must be registered BEFORE the generic /:id route
app.post('/api/roadmap/:id/enroll', async (c) => {
  const { user } = await validateAuth(c.req.raw)
  if (!user) return unauthorized()

  const roadmapId = c.req.param('id')
  await supabase.from('user_roadmaps').upsert(
    { user_id: user.id, roadmap_id: roadmapId, status: 'active' },
    { onConflict: 'user_id,roadmap_id' }
  )
  return c.json({ enrolled: true })
})

app.all('/api/roadmap/:id', (c) => roadmapId(c.req.raw))

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.all('/api/auth/user',     (c) => authUser(c.req.raw))
app.all('/api/auth/callback', (c) => authCallback(c.req.raw))

// ─── Progress ─────────────────────────────────────────────────────────────────
app.all('/api/progress',        (c) => progressIndex(c.req.raw))
app.all('/api/progress/node',   (c) => progressNode(c.req.raw))
app.all('/api/progress/streak', (c) => progressStreak(c.req.raw))

// ─── AI ───────────────────────────────────────────────────────────────────────
// quiz/section must be before /quiz to avoid path shadowing
app.all('/api/ai/quiz/section', (c) => aiQuizSection(c.req.raw))
app.all('/api/ai/stream',       (c) => aiStream(c.req.raw))
app.all('/api/ai/outline',      (c) => aiOutline(c.req.raw))
app.all('/api/ai/content',      (c) => aiContent(c.req.raw))
app.all('/api/ai/explain',      (c) => aiExplain(c.req.raw))
app.all('/api/ai/quiz',         (c) => aiQuiz(c.req.raw))
app.all('/api/ai/feynman',      (c) => aiFeynman(c.req.raw))

// ─── Courses ──────────────────────────────────────────────────────────────────
app.all('/api/courses',     (c) => coursesIndex(c.req.raw))
app.all('/api/courses/:id', (c) => coursesId(c.req.raw))

// ─── Subscription (beta stubs) ────────────────────────────────────────────────
app.all('/api/subscription/status',   (c) => subStatus(c.req.raw))
app.all('/api/subscription/checkout', (c) => subCheckout(c.req.raw))
app.all('/api/subscription/webhook',  (c) => subWebhook(c.req.raw))

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.all('*', (c) => c.json({ error: 'Not found' }, 404))

// ─── Start ────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 3000
console.log(`logiq-ai backend running on port ${port}`)

export default {
  port,
  fetch: app.fetch,
}
