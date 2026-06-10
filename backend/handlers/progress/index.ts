import { validateAuth, unauthorized } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const [{ data: userRoadmaps }, { data: streak }] = await Promise.all([
    supabase
      .from('user_roadmaps')
      .select('roadmap_id, status, progress, started_at, roadmaps(title, category, nodes)')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .single(),
  ])

  const activeRoadmaps = (userRoadmaps || []).map((ur: any) => {
    const nodes = ur.roadmaps?.nodes || []
    const completedCount = Object.values(ur.progress || {}).filter(
      (n: any) => n.status === 'completed'
    ).length
    return {
      roadmapId:   ur.roadmap_id,
      title:       ur.roadmaps?.title,
      category:    ur.roadmaps?.category,
      totalNodes:  nodes.length,
      completedNodes: completedCount,
      percent:     nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0,
      startedAt:   ur.started_at,
    }
  })

  return Response.json({
    activeRoadmaps,
    streak: {
      current:        streak?.current_streak || 0,
      longest:        streak?.longest_streak || 0,
      lastActiveDate: streak?.last_active_date,
      totalXP:        streak?.total_xp || 0,
    },
  })
}
