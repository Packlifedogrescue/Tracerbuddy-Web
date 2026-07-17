import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Picks a code with no currently-active round already using it. This narrows the
// window but doesn't fully close it (two requests could still race between this check
// and the insert below) — the unique index on live_rounds(invite_code) where
// status = 'active' is the actual guarantee; this just avoids relying on it in the
// common case and gives a clean retry path if the insert does hit that constraint.
async function uniqueActiveCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    const { data } = await sb()
      .from('live_rounds')
      .select('id')
      .eq('invite_code', code)
      .eq('status', 'active')
      .maybeSingle()
    if (!data) return code
  }
  // Astronomically unlikely to exhaust 5 attempts at random(36^6) — fall back to a
  // fresh code and let the insert's unique constraint be the final word.
  return randomCode()
}

// POST /api/round/live — create or join a live round
export async function POST(req: NextRequest) {
  try {
    const { action, userId, displayName, handicap, courseId, courseName, roundMode, inviteCode } = await req.json()

    if (action === 'create') {
      let code = await uniqueActiveCode()
      let data: any, error: any
      for (let attempt = 0; attempt < 3; attempt++) {
        ;({ data, error } = await sb()
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
          .single())
        // 23505 = Postgres unique_violation — someone else grabbed this exact code
        // between our check and this insert. Regenerate and try again.
        if (!error || error.code !== '23505') break
        code = randomCode()
      }

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
// GET /api/round/live?code=XXXXXX  — spectator lookup by invite code (no join)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const liveRoundId = searchParams.get('liveRoundId')
  const code        = searchParams.get('code')

  if (code) {
    const { data: round, error: rErr } = await sb()
      .from('live_rounds')
      .select('id, course_name, round_mode, status, created_at')
      .eq('invite_code', code.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (rErr)   return NextResponse.json({ error: rErr.message }, { status: 500 })
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const { data: participants, error: pErr } = await sb()
      .from('live_round_participants')
      .select('display_name, handicap, scores')
      .eq('live_round_id', round.id)

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    // Spectator view: no internal IDs — the round id + a user_id would be
    // enough to forge score updates via PATCH, which has no auth.
    const { id: _id, ...publicRound } = round
    return NextResponse.json({ liveRound: publicRound, participants })
  }

  if (!liveRoundId) return NextResponse.json({ error: 'liveRoundId required' }, { status: 400 })

  const { data, error } = await sb()
    .from('live_round_participants')
    .select('user_id, display_name, handicap, scores')
    .eq('live_round_id', liveRoundId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ participants: data })
}
