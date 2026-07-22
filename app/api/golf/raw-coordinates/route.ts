import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE      = 'https://golfapi.io/api/v2.3'
const CACHE_TTL_DAYS = 30
const CACHE_VERSION  = 1

// GET /api/golf/raw-coordinates?id=COURSE_ID
// Returns the unprocessed POI coordinate list for a course, straight from
// GolfAPI's /coordinates endpoint. The iOS app uses these to compute true
// green centers from all green boundary points instead of the front edge.
export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('id') ?? req.nextUrl.searchParams.get('courseId') ?? ''
  if (!courseId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const GOLF_KEY = process.env.GOLF_API_KEY!
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  const cacheKey = `rawcoords-v${CACHE_VERSION}:${courseId}`
  try {
    const { data: cached } = await sb
      .from('golf_course_details_cache')
      .select('data, cached_at')
      .eq('course_id', cacheKey)
      .maybeSingle()

    if (cached) {
      const age = (Date.now() - new Date(cached.cached_at).getTime()) / 86_400_000
      if (age < CACHE_TTL_DAYS) {
        return NextResponse.json({ ...cached.data, cached: true })
      }
    }
  } catch { /* fall through */ }

  // ── 2. Fetch from GolfAPI ────────────────────────────────────────────────
  try {
    const res  = await fetch(`${GOLF_BASE}/coordinates/${courseId}`, {
      headers: { Authorization: `Bearer ${GOLF_KEY}` },
    })
    const data = await res.json()
    const coordinates = data.coordinates ?? []

    if (!res.ok || coordinates.length === 0) {
      return NextResponse.json(
        { error: 'No coordinates available for this course', courseID: courseId, coordinates: [] },
        { status: coordinates.length === 0 && res.ok ? 404 : res.status || 502 },
      )
    }

    const payload = {
      courseID:       data.courseID ?? courseId,
      numCoordinates: data.numCoordinates ?? coordinates.length,
      coordinates,
    }

    // ── 3. Write to cache (best-effort) ──────────────────────────────────
    try {
      await sb.from('golf_course_details_cache').upsert({
        course_id: cacheKey,
        data:      payload,
        cached_at: new Date().toISOString(),
      })
    } catch { /* ignore */ }

    return NextResponse.json(payload)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch coordinates', detail: String(e) }, { status: 502 })
  }
}
