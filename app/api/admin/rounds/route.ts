import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'miller.brett88@gmail.com'

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
    .select('id, user_id, course_name, total_score, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const roundList = rounds ?? []

  // Get user names from auth
  const userIdSet: Record<string, boolean> = {}
  for (const r of roundList) userIdSet[r.user_id] = true
  const userIds = Object.keys(userIdSet)

  const userMap: Record<string, { display_name: string; email: string }> = {}
  if (userIds.length > 0) {
    try {
      const { data: authData } = await db.auth.admin.listUsers()
      for (const u of authData?.users ?? []) {
        if (userIdSet[u.id]) {
          userMap[u.id] = { display_name: getName(u), email: u.email ?? '' }
        }
      }
    } catch {}
  }

  const enriched = roundList.map(r => ({
    ...r,
    user_profiles: userMap[r.user_id] ?? { display_name: null, email: null },
  }))

  return NextResponse.json({ rounds: enriched, total: count ?? 0, page, limit })
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
