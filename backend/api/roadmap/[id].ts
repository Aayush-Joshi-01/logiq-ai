import { validateAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const roadmapId = req.url.split('/').pop()!
  const { user } = await validateAuth(req)

  // Fetch roadmap + user progress in parallel
  const [{ data: roadmap }, userRoadmapResult] = await Promise.all([
    supabase
      .from('roadmaps')
      .select('*')
      .eq('id', roadmapId)
      .single(),
    user
      ? supabase
          .from('user_roadmaps')
          .select('progress, status')
          .eq('user_id', user.id)
          .eq('roadmap_id', roadmapId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  if (!roadmap) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }

  const progress = userRoadmapResult.data?.progress || {}

  // Merge node status from progress; first node defaults to 'available'
  const nodesWithStatus = (roadmap.nodes || []).map((node: any, index: number) => ({
    ...node,
    status: progress[node.id]?.status || (index === 0 ? 'available' : 'locked'),
  }))

  return Response.json({
    roadmap: {
      ...roadmap,
      nodes: nodesWithStatus,
    },
    userRoadmap: userRoadmapResult.data || null,
  })
}
