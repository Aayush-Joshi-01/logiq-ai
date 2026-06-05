import { supabase } from '../../lib/supabase'

// Public endpoint — no auth required for roadmap list
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { data: roadmaps } = await supabase
    .from('roadmaps')
    .select('id, title, description, category, difficulty, estimated_weeks, is_generated, language')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return Response.json({ roadmaps: roadmaps || [] })
}
