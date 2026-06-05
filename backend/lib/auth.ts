import { supabase } from './supabase'

export async function validateAuth(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return { user: null, error: 'No token' }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  return { user: user ?? null, error: error?.message ?? null }
}

export function unauthorized(message = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function forbidden(message = 'Pro subscription required') {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}
