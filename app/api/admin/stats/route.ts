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
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart   = new Date(Date.now() -  7 * 86400000).toISOString()
  const monthStart  = new Date(Date.now() - 30 * 86400000).toISOString()
  const week4Start  = new Date(Date.now() - 35 * 86400000).toISOString()
  const week4End    = new Date(Date.now() - 28 * 86400000).toISOString()

  const safe = async (q: any) => { try { return await q } catch { return { data: null, count: 0 } } }

  const [
    { count: totalUsers },
    { count: newUsersWeek },
    { count: totalRounds },
    { count: roundsToday },
    { count: roundsWeek },
    { count: totalHoleStats },
    { count: totalPractice },
    { count: totalSwings },
    { count: totalPutts },
    { count: totalPosts },
    { count: totalTournaments },
    { count: proUsers },
    { count: freeUsers },
    { data: allScores },
    { data: topCourses },
    { data: dailyRounds },
    { data: allCourseNames },
    { count: aiCoachUses },
    { count: mapViews },
    { count: weatherViews },
    { data: activeWeekRounds },
    { data: week4Cohort },
    { data: retentionRounds },
    { data: dailyActive },
    { count: errorsDay },
  ] = await Promise.all([
    safe(db.from('user_profiles').select('*', { count: 'exact', head: true })),
    safe(db.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart)),
    safe(db.from('rounds').select('*', { count: 'exact', head: true })),
    safe(db.from('rounds').select('*', { count: 'exact', head: true }).gte('created_at', todayStart)),
    safe(db.from('rounds').select('*', { count: 'exact', head: true }).gte('created_at', weekStart)),
    safe(db.from('hole_stats').select('*', { count: 'exact', head: true })),
    safe(db.from('practice_sessions').select('*', { count: 'exact', head: true })),
    safe(db.from('swing_data').select('*', { count: 'exact', head: true })),
    safe(db.from('putt_data').select('*', { count: 'exact', head: true })),
    safe(db.from('community_posts').select('*', { count: 'exact', head: true })),
    safe(db.from('tournament_results').select('*', { count: 'exact', head: true })),
    safe(db.from('user_profiles').select('*', { count: 'exact', head: true }).eq('subscription', 'pro')),
    safe(db.from('user_profiles').select('*', { count: 'exact', head: true }).neq('subscription', 'pro')),
    safe(db.from('rounds').select('total_score').not('total_score', 'is', null)),
    safe(db.from('rounds').select('course_name').gte('created_at', monthStart)),
    safe(db.from('rounds').select('created_at').gte('created_at', weekStart).order('created_at', { ascending: true })),
    safe(db.from('rounds').select('course_name')),
    safe(db.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'ai_coach_queried').gte('created_at', monthStart)),
    safe(db.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'course_map_viewed').gte('created_at', monthStart)),
    safe(db.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'weather_viewed').gte('created_at', monthStart)),
    safe(db.from('rounds').select('user_id').gte('created_at', weekStart)),
    safe(db.from('user_profiles').select('user_id').gte('created_at', week4Start).lte('created_at', week4End)),
    safe(db.from('rounds').select('user_id').gte('created_at', weekStart)),
    safe(db.from('analytics_events').select('created_at, user_id').gte('created_at', monthStart)),
    safe(db.from('error_logs').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString())),
  ])

  // Avg score
  const scores = (allScores ?? []).map((r: any) => r.total_score).filter((s: any) => s != null && s > 0)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null

  // Unique active users last 7 days
  const activeUserIds = new Set((activeWeekRounds ?? []).map((r: any) => r.user_id).filter(Boolean))
  const activeUsersWeek = activeUserIds.size

  // Rounds per user
  const roundsPerUser = totalUsers && totalUsers > 0 ? ((totalRounds ?? 0) / totalUsers).toFixed(1) : '0'

  // Week-4 retention: users who signed up 28-35 days ago who also made a round in last 7 days
  const cohortIds = new Set((week4Cohort ?? []).map((r: any) => r.user_id).filter(Boolean))
  const retainedIds = new Set((retentionRounds ?? []).map((r: any) => r.user_id).filter(Boolean))
  const retainedCount = Array.from(cohortIds).filter(id => retainedIds.has(id)).length
  const retentionRate = cohortIds.size > 0 ? Math.round((retainedCount / cohortIds.size) * 100) : null

  // Conversion rate & MRR
  const proCount = proUsers ?? 0
  const conversionRate = totalUsers && totalUsers > 0 ? Math.round((proCount / totalUsers) * 100) : 0
  const mrrEstimate = (proCount * 9.99).toFixed(2)

  // Recent signups
  let recentSignups: any[] = []
  let allAuthUsers: any[] = []
  try {
    const { data: authData } = await db.auth.admin.listUsers()
    allAuthUsers = authData?.users ?? []
    recentSignups = allAuthUsers
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(u => ({
        id: u.id,
        display_name: getName(u),
        email: u.email ?? '',
        created_at: u.created_at,
      }))
  } catch {}

  // Course stats
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

  // Daily rounds (last 7 days)
  const dayBuckets: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dayBuckets[d.toISOString().split('T')[0]] = 0
  }
  for (const r of dailyRounds ?? []) {
    const day = r.created_at?.split('T')[0]
    if (day && dayBuckets[day] !== undefined) dayBuckets[day]++
  }

  // Daily active users (last 30 days)
  const dauBuckets: Record<string, Set<string>> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dauBuckets[d.toISOString().split('T')[0]] = new Set()
  }
  for (const e of dailyActive ?? []) {
    const day = e.created_at?.split('T')[0]
    if (day && dauBuckets[day] !== undefined && e.user_id) {
      dauBuckets[day].add(e.user_id)
    }
  }
  const dauData = Object.entries(dauBuckets).map(([date, users]) => ({ date, count: users.size }))

  return NextResponse.json({
    // Users & Rounds
    totalUsers:       totalUsers       ?? 0,
    newUsersWeek:     newUsersWeek     ?? 0,
    totalRounds:      totalRounds      ?? 0,
    roundsToday:      roundsToday      ?? 0,
    roundsWeek:       roundsWeek       ?? 0,
    // Performance
    totalCourses,
    avgScore,
    totalHoleStats:   totalHoleStats   ?? 0,
    totalSwings:      totalSwings      ?? 0,
    // App activity
    totalPractice:    totalPractice    ?? 0,
    totalPutts:       totalPutts       ?? 0,
    totalPosts:       totalPosts       ?? 0,
    totalTournaments: totalTournaments ?? 0,
    // Subscriptions & Revenue
    proUsers:         proCount,
    freeUsers:        freeUsers        ?? 0,
    conversionRate,
    mrrEstimate,
    // Engagement
    activeUsersWeek,
    roundsPerUser,
    retentionRate,
    // Feature usage (30 days)
    aiCoachUses:      aiCoachUses      ?? 0,
    mapViews:         mapViews         ?? 0,
    weatherViews:     weatherViews     ?? 0,
    // Errors
    errorsDay:        errorsDay        ?? 0,
    // Charts
    recentSignups,
    topCourses:       topCoursesList,
    dailyRounds:      Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
    dauData,
  })
}
