import { validateAuth, unauthorized } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  if (req.method === 'GET') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, language, subscription_tier, preferred_style, work_field, years_experience, learning_summary, skills, created_at')
      .eq('id', user.id)
      .single()

    return Response.json({ profile })
  }

  if (req.method === 'PATCH') {
    const body = await req.json()

    // Blocklist: never allow client to write these fields
    const BLOCKED = ['subscription_tier', 'stripe_customer_id', 'stripe_subscription_id', 'inferred_level']
    const sanitized: Record<string, any> = {}

    for (const key of ['display_name', 'language', 'preferred_style', 'work_field', 'years_experience', 'learning_summary', 'skills']) {
      if (key in body && !BLOCKED.includes(key)) {
        sanitized[key] = body[key]
      }
    }

    sanitized.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('profiles')
      .update(sanitized)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }

    return Response.json({ profile: data })
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    return new Response(null, { status: 204 })
  }

  return new Response('Method not allowed', { status: 405 })
}
