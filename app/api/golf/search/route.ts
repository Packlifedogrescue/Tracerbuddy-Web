import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchOpenGolf } from '@/lib/opengolf'

// Course search backed by golfcourseapi.com (free tier). Output shape is kept
// identical to the old GolfAPI.io route so the iOS app doesn't need to change
// how it reads results — only the CourseID format changes (golfcourseapi uses
// opaque 8-char ids). GPS is not available from this provider; Latitude/
// Longitude come back null and hasGPS is 0 (the OSM layer fills GPS in later).
const GOLFCOURSE_BASE = 'https://api.golfcourseapi.com/v1'
const CACHE_TTL_DAYS  = 7
const CACHE_VERSION   = 8  // bumped: OGL twins paired by name-subset + proximity, not exact name

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
// Same check for our already-normalised (PascalCase) results.
function regionMatchesNorm(c: any, region: string): boolean {
  return regionMatches({ location: { state: c.StateCode, country: c.Country } }, region)
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
  const lat = loc.latitude, lng = loc.longitude
  const hasCoords = lat != null && lng != null
  return {
    CourseID:   c.id          ?? '',
    ClubName:   c.club_name   ?? '',
    CourseName: c.course_name ?? '',
    City:       loc.city      ?? '',
    StateCode:  loc.state     ?? '',
    Country:    loc.country   ?? '',
    Latitude:   hasCoords ? lat : null,   // golfcourseapi v1.1 returns coords in location
    Longitude:  hasCoords ? lng : null,
    hasGPS:     hasCoords ? 1 : 0,
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

  // ── 2. Query golfcourseapi + OpenGolfAPI in parallel, then merge ──────────
  // golfcourseapi brings richer per-tee scorecards; OpenGolfAPI (OpenStreetMap)
  // brings broad coverage + GPS. Either can fail without sinking the search.
  const gcPromise = (async (): Promise<any[]> => {
    if (!GOLF_KEY) return []
    try {
      const res  = await fetch(`${GOLFCOURSE_BASE}/search?search_query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${GOLF_KEY}` },
      })
      const data = await res.json()
      let raw = Array.isArray(data) ? data : (data.courses ?? [])
      if (state && raw.length > 0) {
        const f = raw.filter((c: any) => regionMatches(c, state))
        if (f.length > 0) raw = f
      }
      return raw.map(normaliseCourse)
    } catch { return [] }
  })()

  const oglPromise = (async (): Promise<any[]> => {
    try {
      let list = await searchOpenGolf(query)
      if (state) {
        const f = list.filter((c: any) => regionMatchesNorm(c, state))
        if (f.length > 0) list = f
      }
      return list
    } catch { return [] }
  })()

  const [gc, ogl] = await Promise.all([gcPromise, oglPromise])

// Words that appear in half the course names on earth and so carry no identifying signal.
// Stripping them lets "Chambers Bay Golf Club" (golfcourseapi) and "Chambers Bay" (OpenGolfAPI)
// resolve to the same course, which an exact name match never could.
const NOISE_TOKENS = new Set([
  'golf', 'club', 'course', 'courses', 'links', 'country', 'cc', 'gc', 'the', 'at', 'of', 'and',
  'resort', 'national', 'municipal', 'muni', 'public', 'private', 'the',
])

// The identifying words in a course's name, from the club and course name together — either
// provider may carry the distinguishing part in either field.
function nameTokens(c: any): Set<string> {
  const words = `${c.ClubName ?? ''} ${c.CourseName ?? ''}`
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const distinctive = words.filter(w => !NOISE_TOKENS.has(w))
  // A name that is nothing but noise ("The Golf Club") keeps its words — better a weak signal
  // than an empty set that matches everything.
  return new Set(distinctive.length ? distinctive : words)
}

// The same distinctive words on both sides, as a set — order and noise words don't matter, so
// "Chambers Bay Golf Club" and "Chambers Bay" match, but nothing weaker than equality.
//
// Containment is tempting here and is wrong: "Oakmont Country Club" reduces to {oakmont}, which is
// contained in every "Oakmont <something>" — it would pair the genuinely separate Oakmont Green
// Golf Club a few hundred metres away. Requiring equality costs only the twins whose names differ
// by a real word, and those are safer left unpaired.
function sameDistinctiveName(a: Set<string>, b: Set<string>): boolean {
  if (!a.size || a.size !== b.size) return false
  return Array.from(a).every(t => b.has(t))
}

function kmBetween(a: any, b: any): number | null {
  const la = Number(a?.Latitude), lo = Number(a?.Longitude)
  const lb = Number(b?.Latitude), lob = Number(b?.Longitude)
  if (![la, lo, lb, lob].every(Number.isFinite)) return null
  const R = 6371
  const dLat = ((lb - la) * Math.PI) / 180
  const dLng = ((lob - lo) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos((la * Math.PI) / 180) * Math.cos((lb * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// How far apart two records can sit and still be the same course. Generous enough to absorb the
// difference between a clubhouse pin and a course centroid, tight enough that the next course down
// the road is never a candidate.
const TWIN_MAX_KM = 1.5

const GENERIC = /^\d+[-\s]hole course$|^\d+[-\s]loch\b/i
  const clean = (c: any) => {
    const name = (c.CourseName || c.ClubName || '').trim()
    return c.CourseID && name.length > 0 && !GENERIC.test(name)
  }
  const key = (c: any) =>
    `${String(c.CourseName || c.ClubName || '').toLowerCase().trim()}|${String(c.City || '').toLowerCase().trim()}`

  // golfcourseapi first (its richer scorecards win ties); OpenGolfAPI fills gaps.
  // Where a golfcourseapi course also exists in OpenGolfAPI, we keep gc's card but
  // borrow the OGL id (ogl_<uuid>) onto it — the map route uses that to pull
  // /features green-flags + free GPS without losing the richer scorecard.
  const oglClean = ogl.filter(clean)
  const oglByKey = new Map<string, any>()
  for (const c of oglClean) {
    const k = key(c)
    if (!oglByKey.has(k)) oglByKey.set(k, c)
  }

  // Find the OpenGolfAPI record for a golfcourseapi course. An exact name+city key only ever
  // matched when both providers spelled the course identically, which they routinely don't —
  // Chambers Bay is "Chambers Bay Golf Club" to one and "Chambers Bay" to the other, 30m apart in
  // the same town, and went unpaired.
  //
  // So: the distinctive words of one name must be contained in the other's, AND the two must be
  // in the same place (within TWIN_MAX_KM, or the same city when either lacks coordinates).
  // Both conditions are required. Name alone mis-pairs the many identically-named courses in
  // different states; location alone mis-pairs the courses of a multi-course resort, which share
  // a coordinate.
  const findTwin = (c: any): any | null => {
    const exact = oglByKey.get(key(c))
    if (exact) return exact

    const tc = nameTokens(c)
    const city = String(c.City ?? '').toLowerCase().trim()
    const scored: { twin: any; km: number }[] = []
    for (const o of oglClean) {
      if (!sameDistinctiveName(tc, nameTokens(o))) continue
      const km = kmBetween(c, o)
      if (km == null) {
        // No coordinates on one side — fall back to the city, which is all that's left.
        const oCity = String(o.City ?? '').toLowerCase().trim()
        if (city && oCity && city === oCity) scored.push({ twin: o, km: Number.MAX_SAFE_INTEGER })
        continue
      }
      if (km <= TWIN_MAX_KM) scored.push({ twin: o, km })
    }
    if (!scored.length) return null
    scored.sort((a, b) => a.km - b.km)
    // Two candidates equally close and equally plausible means we cannot tell which course this
    // is — at a resort that would attach the wrong course's greens. Better unpaired than wrong.
    if (scored.length > 1 && scored[1].km === scored[0].km) return null
    return scored[0].twin
  }

  const seen = new Set<string>()
  const pairedOgl = new Set<string>()
  const courses: any[] = []

  // golfcourseapi first so its richer scorecard wins, borrowing the OGL id where there's a twin.
  for (const c of gc) {
    if (!clean(c)) continue
    const k = key(c)
    if (seen.has(k)) continue
    seen.add(k)
    const twin = findTwin(c)
    if (twin?.CourseID) {
      c.oglId = twin.CourseID
      // Remember it so the twin isn't also listed on its own — it is this same course, and
      // listing both is how "Chambers Bay" and "Chambers Bay Golf Club" came back as two results.
      pairedOgl.add(twin.CourseID)
    }
    courses.push(c)
  }
  // Then OpenGolfAPI-only courses, which fill gaps golfcourseapi doesn't cover at all.
  for (const c of oglClean) {
    const k = key(c)
    if (seen.has(k) || pairedOgl.has(c.CourseID)) continue
    seen.add(k)
    courses.push(c)
  }

  // ── 3. Write to cache (best-effort) ──────────────────────────────────────
  try {
    await sb.from('golf_courses_cache').upsert({
      search_query: cacheKey,
      results:      courses,
      cached_at:    new Date().toISOString(),
    })
  } catch { /* ignore */ }

  return NextResponse.json({ courses })
}
