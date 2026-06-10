import { validateAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const SELECT = 'id, title, description, category, difficulty, estimated_weeks, is_generated, language, nodes'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)

  const [{ data: publicRoadmaps }, { data: myRoadmaps }] = await Promise.all([
    supabase.from('roadmaps').select(SELECT).eq('is_public', true).order('created_at', { ascending: false }),
    user
      ? supabase.from('roadmaps').select(SELECT).eq('is_public', false).eq('created_by', user.id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ])

  // My generated roadmaps first, then public curated ones
  const seen = new Set<string>()
  const roadmaps = [...(myRoadmaps ?? []), ...(publicRoadmaps ?? [])].filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  return Response.json({ roadmaps })
}
