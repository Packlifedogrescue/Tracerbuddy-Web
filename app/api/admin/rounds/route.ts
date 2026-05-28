import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'brett@tracerbuddy.com'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-admin-email')
    if (authHeader?.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page   = parseInt(searchParams.get('page')  ?? '1')
    const limit  = parseInt(searchParams.get('limit') ?? '25')
    const offset = (page - 1) * limit

    const db = sb()

    const { data: rounds, count, error } = await db
      .from('rounds')
      .select('id, user_id, course_name, course_par, total_score, played_at, gir_count, putts, fairways_hit', { count: 'exact' })
      .order('played_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get auth users to map user_id -> email/name
    const listResult = await db.auth.admin.listUsers()
    const authUsers  = listResult.data?.users ?? []
    const userEmailMap: Record<string, string> = {}
    const userNameMap:  Record<string, string> = {}
    for (const u of authUsers) {
      if (u.email) userEmailMap[u.id] = u.email
      const m = u.user_metadata ?? {}
      const name = m.full_name || m.name || m.display_name || null
      if (name) userNameMap[u.id] = name
    }

    // Get display names from profiles
    const roundList = rounds ?? []
    const userIdSet: Record<string, boolean> = {}
    for (const r of roundList) userIdSet[r.user_id] = true
    const userIds = Object.keys(userIdSet)

    const { data: profiles } = userIds.length
      ? await db.from('user_profiles').select('id, display_name').in('id', userIds)
      : { data: [] }

    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) if (p.display_name) profileMap[p.id] = p.display_name

    const enriched = roundList.map((r: any) => ({
      ...r,
      player_email:  userEmailMap[r.user_id] ?? 'Unknown',
      display_name:  profileMap[r.user_id]   || userNameMap[r.user_id] || null,
    }))

    return NextResponse.json({ rounds: enriched, total: count ?? 0, page, limit })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-admin-email')
    if (authHeader?.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { roundId } = await req.json()
    if (!roundId) return NextResponse.json({ error: 'roundId required' }, { status: 400 })
    await sb().from('rounds').delete().eq('id', roundId)
    return NextResponse.json({ deleted: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
