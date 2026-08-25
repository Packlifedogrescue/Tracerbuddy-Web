import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Course search backed by golfcourseapi.com (free tier). Output shape is kept
// identical to the old GolfAPI.io route so the iOS app doesn't need to change
// how it reads results — only the CourseID format changes (golfcourseapi uses
// opaque 8-char ids). GPS is not available from this provider; Latitude/
// Longitude come back null and hasGPS is 0 (the OSM layer fills GPS in later).
const GOLFCOURSE_BASE = 'https://api.golfcourseapi.com/v1'
const CACHE_TTL_DAYS  = 7
const CACHE_VERSION   = 4  // bumped: results are now golfcourseapi-shaped, not GolfAPI.io

function normalise(q: string) {
  return q.toLowerCase().trim().replace(/\s+/g, ' ')
}

// golfcourseapi Course → the PascalCase shape the app already expects.
function normaliseCourse(c: any) {
  const loc = c.location ?? {}
  return {
    CourseID:   c.id          ?? '',
    ClubName:   c.club_name   ?? '',
    CourseName: c.course_name ?? '',
    City:       loc.city      ?? '',
    StateCode:  loc.state     ?? '',
    Country:    loc.country   ?? '',
    Latitude:   null,   // golfcourseapi has no coordinates; filled by the OSM layer
    Longitude:  null,
    hasGPS:     0,
    numHoles:   18,
  }
}

export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const state = req.nextUrl.searchParams.get('state')?.trim() ?? ''
  const city  = req.nextUrl.searchParams.get('city')?.trim() ?? ''

  if (!raw && !state && !city) return NextResponse.json({ courses: [] })

  // golfcourseapi's search takes a single free-text query — fold state/city in.
  const query = [raw, city, state].filter(Boolean).join(' ')

  const cacheKey = `v${CACHE_VERSION}:${normalise([raw, state, city].filter(Boolean).join('|'))}`
  const GOLF_KEY = process.env.GOLFCOURSE_API_KEY
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  try {
    const { data: cached } = await sb
      .from('golf_courses_cache')
      .select('results, cached_at')
      .eq('search_query', cacheKey)
      .maybeSingle()

    if (cached) {
      const age = (Date.now() - new Date(cached.cached_at).getTime()) / 86_400_000
      if (age < CACHE_TTL_DAYS) {
        return NextResponse.json({ courses: cached.results, cached: true })
      }
    }
  } catch {
    // Cache table may not exist yet — fall through
  }

  if (!GOLF_KEY) {
    return NextResponse.json(
      { courses: [], error: 'GOLFCOURSE_API_KEY is not configured' },
      { status: 500 },
    )
  }

  // ── 2. Call golfcourseapi.com ────────────────────────────────────────────
  try {
    const res  = await fetch(`${GOLFCOURSE_BASE}/search?search_query=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${GOLF_KEY}` },
    })
    const data = await res.json()
    let raw_courses = Array.isArray(data) ? data : (data.courses ?? [])

    // Optional client-side filter for a 2-letter US state code.
    if (state && state.length === 2 && raw_courses.length > 0) {
      const stateUp  = state.toUpperCase()
      const filtered = raw_courses.filter((c: any) =>
        (c.location?.state ?? '').toUpperCase() === stateUp
      )
      if (filtered.length > 0) raw_courses = filtered
    }

    const GENERIC = /^\d+[-\s]hole course$|^\d+[-\s]loch\b/i
    const courses = raw_courses
      .map(normaliseCourse)
      .filter((c: any) => {
        const name = (c.CourseName || c.ClubName || '').trim()
        return c.CourseID && name.length > 0 && !GENERIC.test(name)
      })

    // ── 3. Write to cache (best-effort) ──────────────────────────────────
    try {
      await sb.from('golf_courses_cache').upsert({
        search_query: cacheKey,
        results:      courses,
        cached_at:    new Date().toISOString(),
      })
    } catch { /* ignore */ }

    return NextResponse.json({ courses })
  } catch (e) {
    return NextResponse.json({ courses: [], error: String(e) }, { status: 502 })
  }
}
