import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/social/friends?userId=xxx — get friends list + their recent stats
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data: friendships, error } = await sb()
    .from('friendships')
    .select('friend_id, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'accepted')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const friendIds = (friendships ?? []).map((f: any) => f.friend_id)
  if (friendIds.length === 0) return NextResponse.json({ friends: [] })

  const { data: profiles } = await sb()
    .from('user_profiles')
    .select('id, display_name, avatar_url, handicap')
    .in('id', friendIds)

  // Get most recent round for each friend
  const { data: recentRounds } = await sb()
    .from('rounds')
    .select('user_id, total_score, course_name, course_par, played_at')
    .in('user_id', friendIds)
    .order('played_at', { ascending: false })
    .limit(friendIds.length * 3)

  const lastRoundMap: Record<string, any> = {}
  for (const r of recentRounds ?? []) {
    if (!lastRoundMap[r.user_id]) lastRoundMap[r.user_id] = r
  }

  const friends = (profiles ?? []).map((p: any) => ({
    userId:      p.id,
    displayName: p.display_name,
    avatarUrl:   p.avatar_url,
    handicap:    p.handicap,
    lastRound:   lastRoundMap[p.id] ? {
      score:      lastRoundMap[p.id].total_score,
      toPar:      lastRoundMap[p.id].total_score - (lastRoundMap[p.id].course_par ?? 72),
      course:     lastRoundMap[p.id].course_name,
      playedAt:   lastRoundMap[p.id].played_at,
    } : null,
  }))

  return NextResponse.json({ friends })
}

// POST /api/social/friends — send/accept/decline friend request
export async function POST(req: NextRequest) {
  try {
    const { action, userId, friendId } = await req.json()

    if (!userId || !friendId) return NextResponse.json({ error: 'userId and friendId required' }, { status: 400 })

    if (action === 'request') {
      await sb().from('friendships').upsert([
        { user_id: userId,   friend_id: friendId, status: 'pending' },
        { user_id: friendId, friend_id: userId,   status: 'incoming' },
      ], { onConflict: 'user_id,friend_id' })
      return NextResponse.json({ sent: true })
    }

    if (action === 'accept') {
      await sb().from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', userId).eq('friend_id', friendId)
      await sb().from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', friendId).eq('friend_id', userId)
      return NextResponse.json({ accepted: true })
    }

    if (action === 'remove') {
      await sb().from('friendships').delete()
        .eq('user_id', userId).eq('friend_id', friendId)
      await sb().from('friendships').delete()
        .eq('user_id', friendId).eq('friend_id', userId)
      return NextResponse.json({ removed: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
