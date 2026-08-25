import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOgl, stripOgl, getOpenGolfCourseRaw, normOpenGolfDetail } from '@/lib/opengolf'

// Course detail backed by golfcourseapi.com (free tier). The output payload is
// kept identical to the old GolfAPI.io route so the iOS app reads it unchanged.
// golfcourseapi provides scorecards only — no coordinates — so every GPS field
// (Tee/Green lat-lng, polygons, waypoints, layups, markers) comes back null/[]
// for now. The OpenStreetMap layer (phase 2) fills those in.
const GOLFCOURSE_BASE = 'https://api.golfcourseapi.com/v1'
const CACHE_TTL_DAYS  = 30
const CACHE_VERSION   = 6  // bumped: tees deduped by name (men's + women's no longer double up)

const TEE_COLORS: Record<string, string> = {
  black: '#111111', blue: '#3B82F6', white: '#E5E7EB', gold: '#D4AF37',
  yellow: '#FBBF24', red: '#EF4444', green: '#22A06B', silver: '#C0C0C0',
  gray: '#9CA3AF', grey: '#9CA3AF', orange: '#F97316', purple: '#A855F7',
  championship: '#111111', combo: '#8B7355',
}
function teeColor(name: string): string | null {
  const key = (name ?? '').toLowerCase().trim()
  for (const c of Object.keys(TEE_COLORS)) if (key.includes(c)) return TEE_COLORS[c]
  return null
}

interface GcaHole { par?: number; yardage?: number; handicap?: number }
interface GcaTee {
  tee_name?: string; course_rating?: number; slope_rating?: number
  total_yards?: number; number_of_holes?: number; par_total?: number
  holes?: GcaHole[]
}

// golfcourseapi TeeBox → the app's tee shape (length1..N + gendered rating/slope).
function toAppTee(t: GcaTee, gender: 'men' | 'women') {
  const tee: any = {
    teeName:  t.tee_name ?? 'Tee',
    teeColor: teeColor(t.tee_name ?? ''),
  }
  if (gender === 'men') { tee.courseRatingMen = t.course_rating ?? null; tee.slopeMen = t.slope_rating ?? null }
  else                  { tee.courseRatingWomen = t.course_rating ?? null; tee.slopeWomen = t.slope_rating ?? null }
  ;(t.holes ?? []).forEach((h, i) => { tee[`length${i + 1}`] = h.yardage ?? null })
  return tee
}

function buildCoursePayload(course: any) {
  const maleTees   = (course.tees?.male   ?? []) as GcaTee[]
  const femaleTees = (course.tees?.female ?? []) as GcaTee[]

  // Representative men's tee for the top-line par/rating/slope and hole pars.
  const mainMale = maleTees.find(t => /blue|champ|black|gold/i.test(t.tee_name ?? '')) ?? maleTees[0]
  const mainFemale = femaleTees[0]
  const scorecardTee = mainMale ?? mainFemale ?? { holes: [] }
  const femaleHoles  = mainFemale?.holes ?? []

  const Holes = (scorecardTee.holes ?? []).map((h, i) => ({
    HoleNo:          i + 1,
    Par:             h.par      ?? null,
    ParFemale:       femaleHoles[i]?.par ?? null,
    Yardage:         h.yardage  ?? null,
    Handicap:        h.handicap ?? null,
    HandicapFemale:  femaleHoles[i]?.handicap ?? null,
    // No GPS from golfcourseapi — filled by the OSM layer later.
    TeeLatitude:     null,
    TeeLongitude:    null,
    GreenLatitude:   null,
    GreenLongitude:  null,
    GreenFrontLatitude:  null,
    GreenFrontLongitude: null,
    GreenBackLatitude:   null,
    GreenBackLongitude:  null,
    Marker100:       null,
    Marker150:       null,
    Marker200:       null,
    Waypoints:       [],
    LayupSpots:      [],
  }))

  const totalPar = scorecardTee.par_total
    ?? (Holes.reduce((a: number, h: any) => a + (h.Par ?? 0), 0) || null)

  // Men's + women's tees, deduped by name. golfcourseapi lists them separately, so a course with a
  // "Green" tee for both genders would otherwise show "Green" twice. Keep the first (men's) of each.
  const seenTee = new Set<string>()
  const Tees = [
    ...maleTees.map(t => toAppTee(t, 'men')),
    ...femaleTees.map(t => toAppTee(t, 'women')),
  ].filter(t => {
    const key = (t.teeName ?? '').toLowerCase().trim()
    if (!key) return true                 // keep unnamed tees as-is
    if (seenTee.has(key)) return false
    seenTee.add(key); return true
  })

  const loc = course.location ?? {}
  return {
    CourseID:   course.id          ?? '',
    ClubName:   course.club_name   ?? '',
    CourseName: course.course_name ?? '',
    Address:    loc.address        ?? null,
    City:       loc.city           ?? '',
    StateCode:  loc.state          ?? '',
    Zip:        null,
    Country:    loc.country        ?? '',
    Telephone:  null,
    Email:      null,
    Latitude:   null,   // filled by the OSM layer
    Longitude:  null,
    Par:        totalPar || null,
    Rating:     mainMale?.course_rating ?? mainFemale?.course_rating ?? null,
    Slope:      mainMale?.slope_rating  ?? mainFemale?.slope_rating  ?? null,
    hasGPS:     0,
    CourseType: null,
    NumHoles:   scorecardTee.number_of_holes ?? Holes.length ?? null,
    Architect:  null,
    YearBuilt:  null,
    PriceRange: null,
    Holes,
    holes:      Holes,
    Tees,
    polygons:   [],
    website:    course.scorecard_url ?? null,
    telephone:  null,
  }
}

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('id') ?? req.nextUrl.searchParams.get('courseId') ?? ''
  if (!courseId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const GOLF_KEY = process.env.GOLFCOURSE_API_KEY
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  const cacheKey = `v${CACHE_VERSION}:${courseId}`
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

  // ── OpenGolfAPI course (id prefixed "ogl_") — par-only scorecard, no key ──
  if (isOgl(courseId)) {
    const raw = await getOpenGolfCourseRaw(stripOgl(courseId))
    if (!raw) return NextResponse.json({ error: 'Failed to fetch course' }, { status: 502 })
    const payload = normOpenGolfDetail(raw)
    try {
      await sb.from('golf_course_details_cache').upsert({
        course_id: cacheKey, data: payload, cached_at: new Date().toISOString(),
      })
    } catch { /* ignore */ }
    return NextResponse.json(payload)
  }

  if (!GOLF_KEY) {
    return NextResponse.json({ error: 'GOLFCOURSE_API_KEY is not configured' }, { status: 500 })
  }

  // ── 2. Fetch course detail ───────────────────────────────────────────────
  try {
    const res    = await fetch(`${GOLFCOURSE_BASE}/courses/${encodeURIComponent(courseId)}`, {
      headers: { Authorization: `Bearer ${GOLF_KEY}` },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch course' }, { status: res.status || 502 })
    }
    const json   = await res.json()
    // golfcourseapi returns the course either bare or under a `course` key.
    const course = json.course ?? json

    const payload = buildCoursePayload(course)

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
    return NextResponse.json({ error: 'Failed to fetch course', detail: String(e) }, { status: 502 })
  }
}
