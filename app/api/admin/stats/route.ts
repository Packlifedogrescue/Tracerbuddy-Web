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

  const db = sb()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart  = new Date(Date.now() - 7  * 86400000).toISOString()
  const monthStart = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { count: totalUsers },
    { count: newUsersWeek },
    { count: totalRounds },
    { count: roundsToday },
    { count: roundsWeek },
    { count: totalCourses },
    { data: recentSignups },
    { data: topCourses },
    { data: dailyRounds },
  ] = await Promise.all([
    db.from('user_profiles').select('*', { count: 'exact', head: true }),
    db.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    db.from('rounds').select('*', { count: 'exact', head: true }),
    db.from('rounds').select('*', { count: 'exact', head: true }).gte('played_at', todayStart),
    db.from('rounds').select('*', { count: 'exact', head: true }).gte('played_at', weekStart),
    db.from('courses').select('*', { count: 'exact', head: true }),
    db.from('user_profiles').select('id, display_name, email, created_at').order('created_at', { ascending: false }).limit(5),
    db.from('rounds').select('course_name').gte('played_at', monthStart),
    db.from('rounds').select('played_at').gte('played_at', weekStart).order('played_at', { ascending: true }),
  ])

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
    const day = r.played_at?.split('T')[0]
    if (day && dayBuckets[day] !== undefined) dayBuckets[day]++
  }

  return NextResponse.json({
    totalUsers:    totalUsers   ?? 0,
    newUsersWeek:  newUsersWeek ?? 0,
    totalRounds:   totalRounds  ?? 0,
    roundsToday:   roundsToday  ?? 0,
    roundsWeek:    roundsWeek   ?? 0,
    totalCourses:  totalCourses ?? 0,
    recentSignups: recentSignups ?? [],
    topCourses:    topCoursesList,
    dailyRounds:   Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
  })
}
