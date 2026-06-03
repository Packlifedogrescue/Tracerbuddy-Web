import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE     = 'https://golfapi.io/api/v2.3'
const CACHE_TTL_DAYS = 7
const CACHE_VERSION  = 2  // bump to bust old unfiltered caches

function normalise(q: string) {
  return q.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Normalise API response field names to match frontend interface (PascalCase)
function normaliseCourse(c: any) {
  return {
    CourseID:  c.courseID  ?? c.CourseID  ?? '',
    ClubName:  c.clubName  ?? c.ClubName  ?? '',
    CourseName: c.courseName ?? c.CourseName ?? '',
    City:       c.city      ?? c.City      ?? '',
    StateCode:  c.state     ?? c.StateCode ?? '',
    Country:    c.country   ?? c.Country   ?? '',
    Latitude:   c.latitude  ?? c.Latitude  ?? null,
    Longitude:  c.longitude ?? c.Longitude ?? null,
    hasGPS:     c.hasGPS    ?? 0,
    numHoles:   c.numHoles  ?? 18,
  }
}

export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const state = req.nextUrl.searchParams.get('state')?.trim() ?? ''
  const city  = req.nextUrl.searchParams.get('city')?.trim() ?? ''

  if (!raw && !state) return NextResponse.json({ courses: [] })

  const cacheKey = `v${CACHE_VERSION}:${normalise([raw, state, city].filter(Boolean).join('|'))}`
  const GOLF_KEY = process.env.GOLF_API_KEY!
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

  // ── 2. Call GolfAPI.io ───────────────────────────────────────────────────
  try {
    const params = new URLSearchParams()
    if (raw)   params.set('name', raw)
    if (state) params.set('state', state)
    if (city)  params.set('city', city)

    const res  = await fetch(`${GOLF_BASE}/courses?${params.toString()}`, {
      headers: { Authorization: `Bearer ${GOLF_KEY}` },  // docs: Bearer token
    })
    const data = await res.json()
    let raw_courses = Array.isArray(data) ? data : (data.courses ?? [])

    // Client-side filter for 2-letter US state codes only
    if (state && state.length === 2 && raw_courses.length > 0) {
      const stateUp  = state.toUpperCase()
      const filtered = raw_courses.filter((c: any) =>
        (c.state ?? c.StateCode ?? '').toUpperCase() === stateUp
      )
      if (filtered.length > 0) raw_courses = filtered
    }

    const GENERIC = /^\d+[-\s]hole course$|^\d+[-\s]loch\b/i
    const courses = raw_courses
      .map(normaliseCourse)
      .filter((c: any) => {
        const name = (c.CourseName || c.ClubName || '').trim()
        const lat  = parseFloat(c.Latitude)
        const lng  = parseFloat(c.Longitude)
        return (
          c.CourseID &&
          !GENERIC.test(name) &&
          !isNaN(lat) && lat !== 0 &&
          !isNaN(lng) && lng !== 0
        )
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
