import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/social/leaderboard?courseId=xxx&period=week|month|alltime&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const period   = searchParams.get('period') ?? 'alltime'
  const limit    = parseInt(searchParams.get('limit') ?? '50')

  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  let fromDate: string | null = null
  if (period === 'week') {
    fromDate = new Date(Date.now() - 7 * 86400000).toISOString()
  } else if (period === 'month') {
    fromDate = new Date(Date.now() - 30 * 86400000).toISOString()
  }

  let query = sb()
    .from('rounds')
    .select('user_id, total_score, course_par, played_at, user_profiles(display_name, avatar_url)')
    .eq('course_id', courseId)
    .not('total_score', 'is', null)
    .order('total_score', { ascending: true })
    .limit(limit)

  if (fromDate) query = query.gte('played_at', fromDate)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const entries = (data ?? []).map((r: any, i: number) => ({
    rank:        i + 1,
    userId:      r.user_id,
    displayName: r.user_profiles?.display_name ?? 'Anonymous',
    avatarUrl:   r.user_profiles?.avatar_url ?? null,
    score:       r.total_score,
    toPar:       r.total_score - (r.course_par ?? 72),
    playedAt:    r.played_at,
  }))

  return NextResponse.json({ leaderboard: entries, period, courseId })
}

// POST /api/social/leaderboard — submit a round to the leaderboard (opt-in)
export async function POST(req: NextRequest) {
  try {
    const { roundId, userId, courseId, score, coursePar } = await req.json()
    if (!roundId || !userId || !courseId || !score) {
      return NextResponse.json({ error: 'roundId, userId, courseId, score required' }, { status: 400 })
    }

    const { error } = await sb()
      .from('rounds')
      .update({ leaderboard_opt_in: true })
      .eq('id', roundId)
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ submitted: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
