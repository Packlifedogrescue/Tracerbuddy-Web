import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// POST /api/round/live — create or join a live round
export async function POST(req: NextRequest) {
  try {
    const { action, userId, displayName, handicap, courseId, courseName, roundMode, inviteCode } = await req.json()

    if (action === 'create') {
      const code = randomCode()
      const { data, error } = await sb()
        .from('live_rounds')
        .insert({
          host_user_id: userId,
          course_id:    courseId,
          course_name:  courseName,
          round_mode:   roundMode ?? 'stroke',
          invite_code:  code,
          status:       'active',
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Add host as first participant
      await sb().from('live_round_participants').insert({
        live_round_id: data.id,
        user_id:       userId,
        display_name:  displayName,
        handicap:      handicap ?? 0,
        scores:        {},
      })

      return NextResponse.json({ liveRound: data, inviteCode: code })
    }

    if (action === 'join') {
      const { data: round, error: rErr } = await sb()
        .from('live_rounds')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('status', 'active')
        .single()

      if (rErr || !round) return NextResponse.json({ error: 'Round not found or already completed' }, { status: 404 })

      const { error: pErr } = await sb()
        .from('live_round_participants')
        .upsert({
          live_round_id: round.id,
          user_id:       userId,
          display_name:  displayName,
          handicap:      handicap ?? 0,
          scores:        {},
        }, { onConflict: 'live_round_id,user_id' })

      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
      return NextResponse.json({ liveRound: round })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/round/live — update a participant's score for a hole
export async function PATCH(req: NextRequest) {
  try {
    const { liveRoundId, userId, hole, score } = await req.json()

    const { data: participant } = await sb()
      .from('live_round_participants')
      .select('scores')
      .eq('live_round_id', liveRoundId)
      .eq('user_id', userId)
      .single()

    const scores = { ...(participant?.scores ?? {}), [hole]: score }

    const { error } = await sb()
      .from('live_round_participants')
      .update({ scores })
      .eq('live_round_id', liveRoundId)
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET /api/round/live?liveRoundId=xxx — fetch all participants + scores
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const liveRoundId = searchParams.get('liveRoundId')
  if (!liveRoundId) return NextResponse.json({ error: 'liveRoundId required' }, { status: 400 })

  const { data, error } = await sb()
    .from('live_round_participants')
    .select('user_id, display_name, handicap, scores')
    .eq('live_round_id', liveRoundId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ participants: data })
}
