// GET  /api/courses — list user's courses
// (course creation happens via /api/ai/outline)

import { validateAuth, unauthorized } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  if (req.method === 'GET') {
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        id, title, description, language, status, created_at,
        course_sections(id, title, summary, position, content_generated, quiz_generated)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return Response.json({ courses: courses ?? [] })
  }

  return new Response('Method not allowed', { status: 405 })
}
