import { validateAuth, unauthorized } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const { user } = await validateAuth(req)
  if (!user) return unauthorized()

  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return Response.json({
    current:        streak?.current_streak || 0,
    longest:        streak?.longest_streak || 0,
    lastActiveDate: streak?.last_active_date,
    totalXP:        streak?.total_xp || 0,
  })
}
