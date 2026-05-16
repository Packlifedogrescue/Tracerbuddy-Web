import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE = 'https://api.golfapi.io/api/v2.7'
const CACHE_TTL_DAYS = 30

export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } },
) {
  const { courseId } = params
  const GOLF_KEY = process.env.GOLF_API_KEY!
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  try {
    const { data: cached } = await sb
      .from('golf_course_details_cache')
      .select('data, cached_at')
      .eq('course_id', courseId)
      .maybeSingle()

    if (cached) {
      const age = (Date.now() - new Date(cached.cached_at).getTime()) / 86_400_000
      if (age < CACHE_TTL_DAYS) {
        return NextResponse.json({ ...cached.data, cached: true })
      }
    }
  } catch {
    // Cache table may not exist yet — fall through to live API
  }

  // ── 2. Call GolfAPI.io ───────────────────────────────────────────────────
  try {
    const res  = await fetch(`${GOLF_BASE}/courses/${courseId}?apikey=${GOLF_KEY}`)
    const data = await res.json()

    // ── 3. Write to cache (best-effort) ──────────────────────────────────
    try {
      await sb.from('golf_course_details_cache').upsert({
        course_id: courseId,
        data,
        cached_at: new Date().toISOString(),
      })
    } catch { /* ignore cache write failure */ }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 502 })
  }
}
