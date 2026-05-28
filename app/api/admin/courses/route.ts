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

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const db = sb()

    const { data: rounds, error } = await db
      .from('rounds')
      .select('course_name, total_score, created_at')
      .not('course_name', 'is', null)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const courseMap: Record<string, any> = {}
    for (const r of rounds ?? []) {
      const name = r.course_name
      if (!courseMap[name]) {
        courseMap[name] = { id: name, name, roundCount: 0, lastPlayed: r.created_at, scores: [] }
      }
      courseMap[name].roundCount++
      if (r.total_score) courseMap[name].scores.push(r.total_score)
    }

    let courses = Object.values(courseMap).map((c: any) => ({
      ...c,
      avgScore: c.scores.length ? Math.round(c.scores.reduce((a: number, b: number) => a + b, 0) / c.scores.length) : null,
      scores: undefined,
    })).sort((a: any, b: any) => b.roundCount - a.roundCount)

    if (search) courses = courses.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))

    return NextResponse.json({ courses, total: courses.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
