import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'brett@tracerbuddy.com'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-email')
  if (authHeader?.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page')   ?? '1')
  const limit  = parseInt(searchParams.get('limit')  ?? '25')
  const search = searchParams.get('search') ?? ''
  const offset = (page - 1) * limit

  const db = sb()

  let query = db
    .from('user_profiles')
    .select('id, display_name, email, avatar_url, handicap, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: users, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = (users ?? []).map((u: any) => u.id)
  const { data: roundCounts } = await db
    .from('rounds')
    .select('user_id')
    .in('user_id', userIds)

  const countMap: Record<string, number> = {}
  for (const r of roundCounts ?? []) {
    countMap[r.user_id] = (countMap[r.user_id] || 0) + 1
  }

  const { data: lastRounds } = await db
    .from('rounds')
    .select('user_id, played_at')
    .in('user_id', userIds)
    .order('played_at', { ascending: false })
    .limit(userIds.length * 2)

  const lastActiveMap: Record<string, string> = {}
  for (const r of lastRounds ?? []) {
    if (!lastActiveMap[r.user_id]) lastActiveMap[r.user_id] = r.played_at
  }

  const enriched = (users ?? []).map((u: any) => ({
    ...u,
    roundCount:  countMap[u.id]       ?? 0,
    lastActive:  lastActiveMap[u.id]  ?? null,
  }))

  return NextResponse.json({ users: enriched, total: count ?? 0, page, limit })
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-email')
  if (authHeader?.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const db = sb()
  await db.from('user_profiles').update({
    display_name: 'Deleted User',
    email: null,
    avatar_url: null,
  }).eq('id', userId)

  return NextResponse.json({ deleted: true })
}
