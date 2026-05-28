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

  const db = sb()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart  = new Date(Date.now() - 7  * 86400000).toISOString()
  const monthStart = new Date(Date.now() - 30 * 86400000).toISOString()

  const safe = async (q: any) => { try { return await q } catch { return { data: null, count: 0 } } }

  const [
    { count: totalUsers },
    { count: newUsersWeek },
    { count: totalRounds },
    { count: roundsToday },
    { count: roundsWeek },
    { data: topCourses },
    { data: dailyRounds },
    { data: allCourseNames },
  ] = await Promise.all([
    safe(db.from('user_profiles').select('*', { count: 'exact', head: true })),
    safe(db.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart)),
    safe(db.from('rounds').select('*', { count: 'exact', head: true })),
    safe(db.from('rounds').select('*', { count: 'exact', head: true }).gte('created_at', todayStart)),
    safe(db.from('rounds').select('*', { count: 'exact', head: true }).gte('created_at', weekStart)),
    safe(db.from('rounds').select('course_name').gte('created_at', monthStart)),
    safe(db.from('rounds').select('created_at').gte('created_at', weekStart).order('created_at', { ascending: true })),
    safe(db.from('rounds').select('course_name')),
  ])

  let recentSignups: any[] = []
  try {
    const { data: authData } = await db.auth.admin.listUsers()
    recentSignups = (authData?.users ?? [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(u => ({
        id: u.id,
        display_name: getName(u),
        email: u.email ?? '',
        created_at: u.created_at,
      }))
  } catch {}

  const uniqueCourses: Record<string, boolean> = {}
  for (const r of allCourseNames ?? []) {
    if (r.course_name) uniqueCourses[r.course_name] = true
  }
  const totalCourses = Object.keys(uniqueCourses).length

  const courseCount: Record<string, number> = {}
  for (const r of topCourses ?? []) {
    if (r.course_name) courseCount[r.course_name] = (courseCount[r.course_name] || 0) + 1
  }
  const topCoursesList = Object.entries(courseCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const dayBuckets: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dayBuckets[d.toISOString().split('T')[0]] = 0
  }
  for (const r of dailyRounds ?? []) {
    const day = r.created_at?.split('T')[0]
    if (day && dayBuckets[day] !== undefined) dayBuckets[day]++
  }

  return NextResponse.json({
    totalUsers:    totalUsers   ?? 0,
    newUsersWeek:  newUsersWeek ?? 0,
    totalRounds:   totalRounds  ?? 0,
    roundsToday:   roundsToday  ?? 0,
    roundsWeek:    roundsWeek   ?? 0,
    totalCourses,
    recentSignups,
    topCourses:    topCoursesList,
    dailyRounds:   Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
  })
}
