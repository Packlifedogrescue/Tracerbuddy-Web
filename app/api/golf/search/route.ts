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

// 2-letter code → full name, so a region typed either way (or a country) can be
// matched against golfcourseapi's location fields.
const STATE_BY_CODE: Record<string, string> = {
  al:'alabama', ak:'alaska', az:'arizona', ar:'arkansas', ca:'california', co:'colorado',
  ct:'connecticut', de:'delaware', fl:'florida', ga:'georgia', hi:'hawaii', id:'idaho',
  il:'illinois', in:'indiana', ia:'iowa', ks:'kansas', ky:'kentucky', la:'louisiana',
  me:'maine', md:'maryland', ma:'massachusetts', mi:'michigan', mn:'minnesota', ms:'mississippi',
  mo:'missouri', mt:'montana', ne:'nebraska', nv:'nevada', nh:'new hampshire', nj:'new jersey',
  nm:'new mexico', ny:'new york', nc:'north carolina', nd:'north dakota', oh:'ohio', ok:'oklahoma',
  or:'oregon', pa:'pennsylvania', ri:'rhode island', sc:'south carolina', sd:'south dakota',
  tn:'tennessee', tx:'texas', ut:'utah', vt:'vermont', va:'virginia', wa:'washington',
  wv:'west virginia', wi:'wisconsin', wy:'wyoming', dc:'district of columbia',
}
// Does a course sit in the region the user typed (a state code, state name, or country)?
function regionMatches(course: any, region: string): boolean {
  const r = region.trim().toLowerCase()
  if (!r) return true
  const st = String(course.location?.state ?? '').toLowerCase()
  const co = String(course.location?.country ?? '').toLowerCase()
  if (st === r || co === r) return true
  const stName = STATE_BY_CODE[st] ?? st          // course state as full name
  const rName  = STATE_BY_CODE[r]  ?? r           // typed region as full name (if a code)
  if (stName && (stName === rName || stName === r)) return true
  if (st && STATE_BY_CODE[r] === st) return true  // typed a full name, course has the code
  if (co && (co.includes(r) || r.includes(co))) return true
  return false
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

  // golfcourseapi search is NAME-based, so search on the name/city text and use
  // state/country only as a post-filter. If only a region was given, search it as
  // text as a best effort (the free API can't list a whole state on its own).
  const query = [raw, city].filter(Boolean).join(' ') || state

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

    // Filter by the region field (state code, state name, or country) when given.
    if (state && raw_courses.length > 0) {
      const filtered = raw_courses.filter((c: any) => regionMatches(c, state))
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
