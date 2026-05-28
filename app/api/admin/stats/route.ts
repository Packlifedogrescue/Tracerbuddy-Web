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

    const db = sb()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart  = new Date(Date.now() - 7  * 86400000).toISOString()
    const monthStart = new Date(Date.now() - 30 * 86400000).toISOString()

    const safeCount = async (query: any) => {
      try { const { count } = await query; return count ?? 0 } catch { return 0 }
    }
    const safeData = async (query: any) => {
      try { const { data } = await query; return data ?? [] } catch { return [] }
    }

    const [totalUsers, newUsersWeek, totalRounds, roundsToday, roundsWeek, totalCourses,
           recentSignups, topCoursesRaw, dailyRoundsRaw] = await Promise.all([
      safeCount(db.from('user_profiles').select('*', { count: 'exact', head: true })),
      safeCount(db.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart)),
      safeCount(db.from('rounds').select('*', { count: 'exact', head: true })),
      safeCount(db.from('rounds').select('*', { count: 'exact', head: true }).gte('played_at', todayStart)),
      safeCount(db.from('rounds').select('*', { count: 'exact', head: true }).gte('played_at', weekStart)),
      safeCount(db.from('courses').select('*', { count: 'exact', head: true })),
      safeData(db.from('user_profiles').select('id, display_name, email, created_at').order('created_at', { ascending: false }).limit(5)),
      safeData(db.from('rounds').select('course_name').gte('played_at', monthStart)),
      safeData(db.from('rounds').select('played_at').gte('played_at', weekStart).order('played_at', { ascending: true })),
    ])

    const courseCount: Record<string, number> = {}
    for (const r of topCoursesRaw) {
      if (r.course_name) courseCount[r.course_name] = (courseCount[r.course_name] || 0) + 1
    }
    const topCourses = Object.entries(courseCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    const dayBuckets: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dayBuckets[d.toISOString().split('T')[0]] = 0
    }
    for (const r of dailyRoundsRaw) {
      const day = r.played_at?.split('T')[0]
      if (day && dayBuckets[day] !== undefined) dayBuckets[day]++
    }

    return NextResponse.json({
      totalUsers, newUsersWeek, totalRounds, roundsToday, roundsWeek, totalCourses,
      recentSignups,
      topCourses,
      dailyRounds: Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
