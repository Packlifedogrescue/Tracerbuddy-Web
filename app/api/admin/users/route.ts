import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['miller.brett88@gmail.com', 'brett@tracerbuddy.com']

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function getName(user: any): string {
  const m = user.user_metadata ?? {}
  return m.full_name || m.name || m.display_name || m.username || ''
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-email')
  if (!authHeader || !ADMIN_EMAILS.includes(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page')  ?? '1')
  const limit  = parseInt(searchParams.get('limit') ?? '25')
  const search = searchParams.get('search') ?? ''

  const db = sb()

  const { data: authData, error: authError } = await db.auth.admin.listUsers()
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  let users = (authData?.users ?? []).map(u => ({
    id: u.id,
    display_name: getName(u),
    email: u.email ?? '',
    created_at: u.created_at,
    handicap: null as number | null,
    roundCount: 0,
    lastActive: null as string | null,
    subscription: 'free' as string,
  }))

  if (search) {
    const q = search.toLowerCase()
    users = users.filter(u =>
      u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }

  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const total = users.length
  const pageUsers = users.slice((page - 1) * limit, page * limit)
  const userIds = pageUsers.map(u => u.id)

  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('user_profiles')
      .select('id, handicap, subscription')
      .in('id', userIds)
    const handicapMap: Record<string, number> = {}
    const subscriptionMap: Record<string, string> = {}
    for (const p of profiles ?? []) {
      if (p.handicap != null) handicapMap[p.id] = p.handicap
      subscriptionMap[p.id] = p.subscription ?? 'free'
    }

    const { data: roundRows } = await db
      .from('rounds')
      .select('user_id')
      .in('user_id', userIds)
    const countMap: Record<string, number> = {}
    for (const r of roundRows ?? []) {
      countMap[r.user_id] = (countMap[r.user_id] || 0) + 1
    }

    const { data: lastRounds } = await db
      .from('rounds')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    const lastActiveMap: Record<string, string> = {}
    for (const r of lastRounds ?? []) {
      if (!lastActiveMap[r.user_id]) lastActiveMap[r.user_id] = r.created_at
    }

    for (const u of pageUsers) {
      u.handicap     = handicapMap[u.id]     ?? null
      u.roundCount   = countMap[u.id]        ?? 0
      u.lastActive   = lastActiveMap[u.id]   ?? null
      u.subscription = subscriptionMap[u.id] ?? 'free'
    }
  }

  return NextResponse.json({ users: pageUsers, total, page, limit })
}

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-email')
  if (!authHeader || !ADMIN_EMAILS.includes(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { userId, subscription } = await req.json()
  if (!userId || !['pro', 'free'].includes(subscription)) {
    return NextResponse.json({ error: 'userId and subscription (pro|free) required' }, { status: 400 })
  }

  const db = sb()
  const { error } = await db
    .from('user_profiles')
    .update({ subscription })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: true, subscription })
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-email')
  if (!authHeader || !ADMIN_EMAILS.includes(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const db = sb()
  await db.auth.admin.deleteUser(userId)
  await db.from('user_profiles').delete().eq('id', userId)
  return NextResponse.json({ deleted: true })
}
