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

    const safe = async (q: any) => { try { return await q } catch { return { data: null, count: 0 } } }

    const [
      usersResult,
      newUsersResult,
      totalRoundsResult,
      roundsTodayResult,
      roundsWeekResult,
      recentSignupsResult,
      topCoursesResult,
      dailyRoundsResult,
      totalShotsResult,
      avgScoreResult,
    ] = await Promise.all([
      safe(db.from('user_profiles').select('*', { count: 'exact', head: true })),
      safe(db.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart)),
      safe(db.from('rounds').select('*', { count: 'exact', head: true })),
      safe(db.from('rounds').select('*', { count: 'exact', head: true }).gte('created_at', todayStart)),
      safe(db.from('rounds').select('*', { count: 'exact', head: true }).gte('created_at', weekStart)),
      safe(db.from('user_profiles').select('id, display_name, email, created_at').order('created_at', { ascending: false }).limit(5)),
      safe(db.from('rounds').select('course_name').gte('created_at', monthStart)),
      safe(db.from('rounds').select('created_at').gte('created_at', weekStart).order('created_at', { ascending: true })),
      safe(db.from('shots').select('*', { count: 'exact', head: true })),
      safe(db.from('rounds').select('total_score').not('total_score', 'is', null).limit(200)),
    ])

    // Auth users for recent signups
    const listResult = await db.auth.admin.listUsers()
    const authUsers  = listResult.data?.users ?? []
    const recentAuth = authUsers
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        display_name: (u.user_metadata as any)?.full_name || (u.user_metadata as any)?.name || null,
        created_at: u.created_at,
      }))

    // Top courses
    const courseCount: Record<string, number> = {}
    for (const r of topCoursesResult.data ?? []) {
      if (r.course_name) courseCount[r.course_name] = (courseCount[r.course_name] || 0) + 1
    }
    const topCourses = Object.entries(courseCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // Daily rounds (7 days)
    const dayBuckets: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      dayBuckets[new Date(Date.now() - i * 86400000).toISOString().split('T')[0]] = 0
    }
    for (const r of dailyRoundsResult.data ?? []) {
      const day = (r.created_at ?? '').split('T')[0]
      if (dayBuckets[day] !== undefined) dayBuckets[day]++
    }

    // Avg score
    const scores = (avgScoreResult.data ?? []).map((r: any) => r.total_score).filter(Boolean)
    const avgScore = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null

    return NextResponse.json({
      totalUsers:    authUsers.length,
      newUsersWeek:  newUsersResult.count  ?? 0,
      totalRounds:   totalRoundsResult.count ?? 0,
      roundsToday:   roundsTodayResult.count ?? 0,
      roundsWeek:    roundsWeekResult.count  ?? 0,
      totalShots:    totalShotsResult.count  ?? 0,
      avgScore,
      recentSignups: recentAuth,
      topCourses,
      dailyRounds:   Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
