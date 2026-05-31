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
  const search = searchParams.get('search') ?? ''
  const offset = (page - 1) * limit

  const db = sb()

  let query = db
    .from('courses')
    .select('id, name, city, state, country, par, course_rating, slope_rating, created_at', { count: 'exact' })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`)
  }

  const { data: courses, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ courses: courses ?? [], total: count ?? 0, page, limit })
}

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-email')
  if (authHeader !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name', 'city', 'state', 'country', 'par', 'course_rating', 'slope_rating']
  const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  const { error } = await sb().from('courses').update(safe).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ updated: true })
}
