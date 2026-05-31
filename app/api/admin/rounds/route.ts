import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'miller.brett88@gmail.com'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-email')
  if (authHeader !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page')  ?? '1')
  const limit  = parseInt(searchParams.get('limit') ?? '25')
  const offset = (page - 1) * limit

  const db = sb()

  const { data: rounds, count, error } = await db
    .from('rounds')
    .select(`
      id, user_id, course_name, course_par, total_score,
      played_at, gir_count, putts, fairways_hit,
      user_profiles(display_name, email)
    `, { count: 'exact' })
    .order('played_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rounds: rounds ?? [], total: count ?? 0, page, limit })
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-email')
  if (authHeader !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { roundId } = await req.json()
  if (!roundId) return NextResponse.json({ error: 'roundId required' }, { status: 400 })

  const db = sb()
  await db.from('rounds').delete().eq('id', roundId)
  return NextResponse.json({ deleted: true })
}
