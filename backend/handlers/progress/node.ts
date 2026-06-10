import { validateAuth, unauthorized } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const { roadmapId, nodeId, quizScore, feynmanScore, timeSpentMinutes } = await req.json()

  // 1. Insert completion (ON CONFLICT DO NOTHING — idempotent for offline sync)
  await supabase.from('node_completions').upsert({
    user_id:             user.id,
    roadmap_id:          roadmapId,
    node_id:             nodeId,
    quiz_score:          quizScore,
    feynman_score:       feynmanScore,
    time_spent_minutes:  timeSpentMinutes,
  }, { onConflict: 'user_id,node_id', ignoreDuplicates: true })

  // 2. Update progress JSONB on user_roadmaps
  const { data: ur } = await supabase
    .from('user_roadmaps')
    .select('progress')
    .eq('user_id', user.id)
    .eq('roadmap_id', roadmapId)
    .single()

  const updatedProgress = {
    ...(ur?.progress || {}),
    [nodeId]: {
      status:      'completed',
      completedAt: new Date().toISOString(),
      quizScore,
      feynmanScore,
    },
  }

  await supabase
    .from('user_roadmaps')
    .update({ progress: updatedProgress })
    .eq('user_id', user.id)
    .eq('roadmap_id', roadmapId)

  // 3. Update streak
  await updateStreak(user.id)

  // 4. Unlock next nodes based on roadmap edges
  const unlockedNodes = await unlockNextNodes(roadmapId, nodeId, user.id, updatedProgress)

  // 5. Seed SRS entry if enabled (V2)
  if (process.env.SRS_ENABLED === 'true') {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('srs_entries').upsert({
      user_id:       user.id,
      node_id:       nodeId,
      roadmap_id:    roadmapId,
      next_review_at: tomorrow,
    }, { onConflict: 'user_id,node_id', ignoreDuplicates: true })
  }

  return Response.json({ success: true, unlockedNodes })
}

async function updateStreak(userId: string) {
  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!streak) return

  const todayUTC = new Date().toISOString().split('T')[0]
  const lastDate = streak.last_active_date

  if (lastDate === todayUTC) return // Already updated today

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const newStreak  = lastDate === yesterday ? streak.current_streak + 1 : 1
  const xpGain     = 50

  await supabase.from('streaks').update({
    current_streak:  newStreak,
    longest_streak:  Math.max(newStreak, streak.longest_streak),
    last_active_date: todayUTC,
    total_xp:        streak.total_xp + xpGain,
    updated_at:      new Date().toISOString(),
  }).eq('user_id', userId)
}

async function unlockNextNodes(
  roadmapId: string,
  completedNodeId: string,
  userId: string,
  currentProgress: Record<string, any>
): Promise<string[]> {
  const { data: roadmap } = await supabase
    .from('roadmaps')
    .select('nodes, edges')
    .eq('id', roadmapId)
    .single()

  if (!roadmap) return []

  const edges: { source: string; target: string }[] = roadmap.edges || []
  const nodes: { id: string }[] = roadmap.nodes || []

  // Find all nodes that have completedNodeId as a direct predecessor
  const candidateTargets = edges
    .filter((e) => e.source === completedNodeId)
    .map((e) => e.target)

  const newlyUnlocked: string[] = []
  const updatedProgress = { ...currentProgress }

  for (const targetId of candidateTargets) {
    // Skip if already completed or available
    const currentStatus = currentProgress[targetId]?.status
    if (currentStatus === 'completed' || currentStatus === 'available') continue

    // Check ALL incoming edges — every parent must be completed
    const incomingEdges = edges.filter((e) => e.target === targetId)
    const allParentsDone = incomingEdges.every(
      (e) => currentProgress[e.source]?.status === 'completed'
    )

    if (allParentsDone) {
      updatedProgress[targetId] = { status: 'available' }
      newlyUnlocked.push(targetId)
    }
  }

  if (newlyUnlocked.length > 0) {
    await supabase
      .from('user_roadmaps')
      .update({ progress: updatedProgress })
      .eq('user_id', userId)
      .eq('roadmap_id', roadmapId)
  }

  return newlyUnlocked
}
