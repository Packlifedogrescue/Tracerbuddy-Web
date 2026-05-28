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

    // Only select columns we know exist
    const { data: rounds, error } = await db
      .from('rounds')
      .select('course_name, total_score, played_at')
      .not('course_name', 'is', null)
      .order('played_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Aggregate unique courses from rounds data
    const courseMap: Record<string, any> = {}
    for (const r of rounds ?? []) {
      const name = r.course_name
      if (!courseMap[name]) {
        courseMap[name] = { id: name, name, roundCount: 0, lastPlayed: r.played_at }
      }
      courseMap[name].roundCount++
    }

    let courses = Object.values(courseMap).sort((a: any, b: any) => b.roundCount - a.roundCount)

    if (search) {
      courses = courses.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
    }

    return NextResponse.json({ courses, total: courses.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
