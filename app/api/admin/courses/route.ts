import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['miller.brett88@gmail.com', 'brett@tracerbuddy.com']

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

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

  const { data: rounds, error } = await db
    .from('rounds')
    .select('course_name, total_score, created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const courseMap: Record<string, { roundCount: number; totalScore: number; scoreCount: number; lastPlayed: string }> = {}
  for (const r of rounds ?? []) {
    const name = r.course_name
    if (!name) continue
    if (!courseMap[name]) courseMap[name] = { roundCount: 0, totalScore: 0, scoreCount: 0, lastPlayed: '' }
    courseMap[name].roundCount++
    if (r.total_score != null) {
      courseMap[name].totalScore += r.total_score
      courseMap[name].scoreCount++
    }
    if (!courseMap[name].lastPlayed || r.created_at > courseMap[name].lastPlayed) {
      courseMap[name].lastPlayed = r.created_at
    }
  }

  let courses = Object.entries(courseMap)
    .map(([name, stats]) => ({
      name,
      roundCount: stats.roundCount,
      avgScore: stats.scoreCount > 0 ? Math.round(stats.totalScore / stats.scoreCount) : null,
      lastPlayed: stats.lastPlayed || null,
    }))
    .sort((a, b) => b.roundCount - a.roundCount)

  if (search) {
    courses = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  }

  const total = courses.length
  const paginated = courses.slice((page - 1) * limit, page * limit)

  return NextResponse.json({ courses: paginated, total, page, limit })
}
