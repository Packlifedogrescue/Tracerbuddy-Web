import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE      = 'https://golfapi.io/api/v2.3'
const CACHE_TTL_DAYS = 30

// POI types from the coordinates endpoint
const POI_BACK_TEE  = 12
const POI_FRONT_TEE = 11
const POI_GREEN     = 1

function golfHeaders(key: string) {
  return { Authorization: `Bearer ${key}` }
}

// Transform the raw GolfAPI course response into the shape our frontend expects
function buildCoursePayload(course: any, coordinates: any[]) {
  const parsMen    = course.parsMen    ?? []
  const indexesMen = course.indexesMen ?? []
  const firstTee   = course.tees?.[0]  ?? {}
  const mainTee    = course.tees?.find((t: any) => /blue|champ|black|gold/i.test(t.teeName ?? '')) ?? firstTee

  // Build per-hole GPS lookup from coordinates array
  const holeCoords: Record<number, { tLat?: string; tLng?: string; gLat?: string; gLng?: string }> = {}
  for (const c of coordinates) {
    const h = Number(c.hole)
    if (!holeCoords[h]) holeCoords[h] = {}
    if ((c.poi === POI_BACK_TEE || c.poi === POI_FRONT_TEE) && !holeCoords[h].tLat) {
      holeCoords[h].tLat = String(c.latitude)
      holeCoords[h].tLng = String(c.longitude)
    }
    if (c.poi === POI_GREEN) {
      holeCoords[h].gLat = String(c.latitude)
      holeCoords[h].gLng = String(c.longitude)
    }
  }

  // Build Holes array matching frontend GolfHole interface
  const Holes = parsMen.map((par: number, i: number) => {
    const holeNo  = i + 1
    const yardKey = `length${holeNo}` as keyof typeof mainTee
    const coords  = holeCoords[holeNo] ?? {}
    return {
      HoleNo:         holeNo,
      Par:            par,
      Yardage:        mainTee[yardKey] ?? null,
      Handicap:       indexesMen[i]    ?? null,
      TeeLatitude:    coords.tLat      ?? null,
      TeeLongitude:   coords.tLng      ?? null,
      GreenLatitude:  coords.gLat      ?? null,
      GreenLongitude: coords.gLng      ?? null,
    }
  })

  const totalPar = parsMen.reduce((a: number, b: number) => a + b, 0)

  return {
    CourseID:   course.courseID  ?? '',
    ClubName:   course.clubName  ?? '',
    CourseName: course.courseName ?? '',
    City:       course.city      ?? '',
    StateCode:  course.state     ?? '',
    Country:    course.country   ?? '',
    Latitude:   course.latitude  ?? null,
    Longitude:  course.longitude ?? null,
    Par:        totalPar || null,
    Rating:     firstTee.courseRatingMen   ?? null,
    Slope:      firstTee.slopeMen          ?? null,
    hasGPS:     course.hasGPS,
    Holes,
    holes: Holes,
    Tees:  course.tees ?? [],
    website:   course.website   ?? null,
    telephone: course.telephone ?? null,
  }
}

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('id') ?? req.nextUrl.searchParams.get('courseId') ?? ''
  if (!courseId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const debug = req.nextUrl.searchParams.get('debug') === '1'
  const GOLF_KEY = process.env.GOLF_API_KEY!
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Check Supabase cache (skipped in debug mode) ─────────────────────
  if (!debug) try {
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
  } catch { /* fall through */ }

  // ── 2. Fetch course detail ───────────────────────────────────────────────
  try {
    const headers = golfHeaders(GOLF_KEY)

    const courseRes = await fetch(`${GOLF_BASE}/courses/${courseId}`, { headers })
    const course    = await courseRes.json()

    // ── 3. Fetch GPS coordinates if available ────────────────────────────
    let coordinates: any[] = []
    if (course.hasGPS === 1 || course.hasGPS === '1') {
      try {
        const coordRes  = await fetch(`${GOLF_BASE}/coordinates/${courseId}`, { headers })
        const coordData = await coordRes.json()
        coordinates = coordData.coordinates ?? []
      } catch { /* GPS is optional — proceed without */ }
    }

    const payload = buildCoursePayload(course, coordinates)

    // Debug: expose raw POI types so we can verify green coordinate mapping
    if (debug) {
      const poiSummary = coordinates.reduce((acc: Record<number, number>, c: any) => {
        acc[c.poi] = (acc[c.poi] ?? 0) + 1
        return acc
      }, {})
      const sample = coordinates.filter((c: any) => c.hole === 1).map((c: any) => ({
        hole: c.hole, poi: c.poi, lat: c.latitude, lng: c.longitude
      }))
      return NextResponse.json({ poiSummary, hole1Sample: sample, ...payload })
    }

    // ── 4. Write to cache (best-effort) ──────────────────────────────────
    try {
      await sb.from('golf_course_details_cache').upsert({
        course_id: courseId,
        data:      payload,
        cached_at: new Date().toISOString(),
      })
    } catch { /* ignore */ }

    return NextResponse.json(payload)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch course', detail: String(e) }, { status: 502 })
  }
}
