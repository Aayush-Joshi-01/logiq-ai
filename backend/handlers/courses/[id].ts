// GET    /api/courses/[id] — course detail with sections
// DELETE /api/courses/[id] — archive a course

import { validateAuth, unauthorized } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const url     = new URL(req.url)
  const courseId = url.pathname.split('/').pop()

  if (req.method === 'GET') {
    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        id, title, description, language, status, created_at,
        course_sections(id, title, summary, position, content_generated, quiz_generated)
      `)
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (error || !course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    // Sort sections by position
    const sections = [...(course.course_sections ?? [])].sort((a, b) => a.position - b.position)
    return Response.json({ course: { ...course, course_sections: sections } })
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('courses')
      .update({ status: 'archived' })
      .eq('id', courseId)
      .eq('user_id', user.id)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(null, { status: 204 })
  }

  return new Response('Method not allowed', { status: 405 })
}
