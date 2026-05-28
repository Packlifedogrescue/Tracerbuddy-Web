import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'brett@tracerbuddy.com'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function getName(user: any): string | null {
  const m = user.user_metadata ?? {}
  return m.full_name || m.name || m.display_name || m.username || null
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-admin-email')
    if (authHeader?.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page   = parseInt(searchParams.get('page')   ?? '1')
    const limit  = parseInt(searchParams.get('limit')  ?? '25')
    const search = searchParams.get('search') ?? ''

    const db = sb()

    const listResult = await db.auth.admin.listUsers({ page, perPage: limit })
    const authUsers  = listResult.data?.users ?? []
    const total      = listResult.data?.total  ?? authUsers.length

    const filtered = search
      ? authUsers.filter(u =>
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          getName(u)?.toLowerCase().includes(search.toLowerCase())
        )
      : authUsers

    const userIds = filtered.map(u => u.id)

    // Profile data (handicap, avatar)
    const { data: profiles } = userIds.length
      ? await db.from('user_profiles').select('id, display_name, avatar_url, handicap').in('id', userIds)
      : { data: [] }

    const profileMap: Record<string, any> = {}
    for (const p of profiles ?? []) profileMap[p.id] = p

    // Round counts
    const { data: roundRows } = userIds.length
      ? await db.from('rounds').select('user_id').in('user_id', userIds)
      : { data: [] }

    const countMap: Record<string, number> = {}
    for (const r of roundRows ?? []) countMap[r.user_id] = (countMap[r.user_id] || 0) + 1

    // Last active
    const { data: lastRounds } = userIds.length
      ? await db.from('rounds').select('user_id, played_at').in('user_id', userIds)
          .order('played_at', { ascending: false }).limit(userIds.length * 3)
      : { data: [] }

    const lastActiveMap: Record<string, string> = {}
    for (const r of lastRounds ?? []) {
      if (!lastActiveMap[r.user_id]) lastActiveMap[r.user_id] = r.played_at
    }

    const enriched = filtered.map(u => ({
      id:           u.id,
      email:        u.email ?? null,
      display_name: profileMap[u.id]?.display_name || getName(u),
      avatar_url:   profileMap[u.id]?.avatar_url   ?? null,
      handicap:     profileMap[u.id]?.handicap      ?? null,
      created_at:   u.created_at,
      roundCount:   countMap[u.id]      ?? 0,
      lastActive:   lastActiveMap[u.id] ?? null,
    }))

    return NextResponse.json({ users: enriched, total, page, limit })
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
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const db = sb()
    await db.auth.admin.deleteUser(userId)
    await db.from('user_profiles').delete().eq('id', userId)
    return NextResponse.json({ deleted: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
