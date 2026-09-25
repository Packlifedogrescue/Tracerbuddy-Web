import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET — fetch memory for a user/course to inject into caddie prompt
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId   = searchParams.get('userId')
  const courseId = searchParams.get('courseId')
  const hole     = searchParams.get('hole')

  if (!userId || !courseId) {
    return NextResponse.json({ error: 'userId and courseId required' }, { status: 400 })
  }

  let query = sb()
    .from('caddie_memory')
    .select('hole_number, advice, lie, outcome, wind_speed, created_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (hole) query = query.eq('hole_number', parseInt(hole))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by hole and return most recent advice per hole
  const byHole: Record<number, any[]> = {}
  for (const row of data ?? []) {
    if (!byHole[row.hole_number]) byHole[row.hole_number] = []
    if (byHole[row.hole_number].length < 3) byHole[row.hole_number].push(row)
  }

  return NextResponse.json({ memory: byHole })
}

// POST — save caddie advice after a shot
export async function POST(req: NextRequest) {
  try {
    const { userId, courseId, holeNumber, advice, lie, windSpeed, outcome } = await req.json()

    if (!userId || !courseId || !holeNumber || !advice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await sb()
      .from('caddie_memory')
      .insert({
        user_id:     userId,
        course_id:   courseId,
        hole_number: holeNumber,
        advice,
        lie:         lie ?? null,
        wind_speed:  windSpeed ?? null,
        outcome:     outcome ?? 'neutral',
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ saved: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH — update the outcome on the most recent memory record for a hole (e.g. after
// the shot lands and we know whether the advice worked out)
export async function PATCH(req: NextRequest) {
  try {
    const { userId, courseId, holeNumber, outcome } = await req.json()

    if (!userId || !courseId || !holeNumber || !outcome) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: recent, error: findErr } = await sb()
      .from('caddie_memory')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
    if (!recent) return NextResponse.json({ error: 'No memory record found for this hole' }, { status: 404 })

    const { error } = await sb()
      .from('caddie_memory')
      .update({ outcome })
      .eq('id', recent.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
