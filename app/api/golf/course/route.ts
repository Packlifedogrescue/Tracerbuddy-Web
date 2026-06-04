import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE      = 'https://golfapi.io/api/v2.3'
const CACHE_TTL_DAYS = 30
const CACHE_VERSION  = 4

// POI types from the coordinates endpoint
const POI_GREEN     = 1
const POI_FAIRWAY   = 2
const POI_ROUGH     = 3
const POI_BUNKER    = 4
const POI_WATER     = 5
const POI_OB        = 6  // out of bounds
const POI_DOGLEG    = 7  // ordered waypoints along the fairway path
const POI_LAYUP     = 8  // recommended layup spots
const POI_FRONT_TEE = 11
const POI_BACK_TEE  = 12

const POLYGON_POIS = new Set([POI_FAIRWAY, POI_ROUGH, POI_BUNKER, POI_WATER, POI_OB])

function golfHeaders(key: string) {
  return { Authorization: `Bearer ${key}` }
}

export interface CoursePolygon {
  hole:   number
  poi:    number
  group:  number
  points: { lat: number; lng: number }[]
}

// Haversine distance in yards between two GPS points
function yardsFromCoords(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.09361)
}

function buildCoursePayload(course: any, coordinates: any[]) {
  const parsMen       = course.parsMen       ?? []
  const indexesMen    = course.indexesMen    ?? []
  const parsFemale    = course.parsFemale    ?? []
  const indexesFemale = course.indexesFemale ?? []
  const firstTee      = course.tees?.[0]     ?? {}
  const mainTee       = course.tees?.find((t: any) => /blue|champ|black|gold/i.test(t.teeName ?? '')) ?? firstTee

  const holeCoords: Record<number, { tLat?: string; tLng?: string; gLat?: string; gLng?: string }> = {}
  const holeGreenPoints: Record<number, { lat: number; lng: number }[]> = {}
  const polygonMap: Record<string, CoursePolygon> = {}
  const doglegMap: Record<number, { lat: number; lng: number; order: number }[]> = {}
  const layupMap:  Record<number, { lat: number; lng: number; order: number }[]> = {}

  for (const c of coordinates) {
    const h = Number(c.hole)
    if (!holeCoords[h]) holeCoords[h] = {}

    if ((c.poi === POI_BACK_TEE || c.poi === POI_FRONT_TEE) && !holeCoords[h].tLat) {
      holeCoords[h].tLat = String(c.latitude)
      holeCoords[h].tLng = String(c.longitude)
    }
    if (c.poi === POI_GREEN) {
      if (!holeGreenPoints[h]) holeGreenPoints[h] = []
      holeGreenPoints[h].push({ lat: Number(c.latitude), lng: Number(c.longitude) })
    }
    if (POLYGON_POIS.has(c.poi)) {
      const key = `${h}-${c.poi}-${c.group ?? 0}`
      if (!polygonMap[key]) polygonMap[key] = { hole: h, poi: c.poi, group: c.group ?? 0, points: [] }
      polygonMap[key].points.push({ lat: Number(c.latitude), lng: Number(c.longitude) })
    }
    if (c.poi === POI_DOGLEG) {
      if (!doglegMap[h]) doglegMap[h] = []
      doglegMap[h].push({ lat: Number(c.latitude), lng: Number(c.longitude), order: c.group ?? 0 })
    }
    if (c.poi === POI_LAYUP) {
      if (!layupMap[h]) layupMap[h] = []
      layupMap[h].push({ lat: Number(c.latitude), lng: Number(c.longitude), order: c.group ?? 0 })
    }
  }

  // Average green POI points per hole → true green center
  for (const [h, pts] of Object.entries(holeGreenPoints)) {
    if (pts.length === 0) continue
    const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
    const avgLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length
    holeCoords[Number(h)].gLat = String(avgLat)
    holeCoords[Number(h)].gLng = String(avgLng)
  }

  // Sort ordered point sets by group number
  for (const h of Object.keys(doglegMap)) doglegMap[Number(h)].sort((a, b) => a.order - b.order)
  for (const h of Object.keys(layupMap))  layupMap[Number(h)].sort((a, b) => a.order - b.order)

  const polygons: CoursePolygon[] = Object.values(polygonMap).filter(p => p.points.length >= 3)

  const Holes = parsMen.map((par: number, i: number) => {
    const holeNo   = i + 1
    const yardKey  = `length${holeNo}` as keyof typeof mainTee
    const coords   = holeCoords[holeNo] ?? {}
    const tLat     = coords.tLat ? Number(coords.tLat) : null
    const tLng     = coords.tLng ? Number(coords.tLng) : null
    const waypoints = (doglegMap[holeNo] ?? []).map(({ lat, lng }) => ({ lat, lng }))
    const layupSpots = (layupMap[holeNo] ?? []).map(({ lat, lng }) => ({
      lat, lng,
      yards: tLat && tLng ? yardsFromCoords(tLat, tLng, lat, lng) : null,
    }))
    return {
      HoleNo:          holeNo,
      Par:             par,
      ParFemale:       parsFemale[i]    ?? null,
      Yardage:         mainTee[yardKey] ?? null,
      Handicap:        indexesMen[i]    ?? null,
      HandicapFemale:  indexesFemale[i] ?? null,
      TeeLatitude:     coords.tLat      ?? null,
      TeeLongitude:    coords.tLng      ?? null,
      GreenLatitude:   coords.gLat      ?? null,
      GreenLongitude:  coords.gLng      ?? null,
      Waypoints:       waypoints,
      LayupSpots:      layupSpots,
    }
  })

  const totalPar = parsMen.reduce((a: number, b: number) => a + b, 0)

  // Price range: GolfAPI returns 1–4; map to $–$$$$
  const priceRaw = course.priceRange ?? course.pricingRange ?? null
  const priceDisplay = priceRaw != null
    ? (Number.isInteger(Number(priceRaw)) ? '$'.repeat(Math.min(Math.max(Number(priceRaw), 1), 4)) : String(priceRaw))
    : null

  return {
    CourseID:   course.courseID   ?? '',
    ClubName:   course.clubName   ?? '',
    CourseName: course.courseName ?? '',
    Address:    course.address    ?? null,
    City:       course.city       ?? '',
    StateCode:  course.state      ?? '',
    Zip:        course.zip        ?? null,
    Country:    course.country    ?? '',
    Telephone:  course.telephone  ?? null,
    Email:      course.email      ?? null,
    Latitude:   course.latitude   ?? null,
    Longitude:  course.longitude  ?? null,
    Par:        totalPar || null,
    Rating:     firstTee.courseRatingMen ?? null,
    Slope:      firstTee.slopeMen        ?? null,
    hasGPS:     course.hasGPS,
    CourseType: course.courseType ?? null,
    NumHoles:   course.numHoles   ?? null,
    Architect:  course.architect  ?? null,
    YearBuilt:  course.yearBuilt  ?? course.yearFounded ?? null,
    PriceRange: priceDisplay,
    Holes,
    holes:    Holes,
    Tees:     course.tees ?? [],
    polygons,
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

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  const cacheKey = `v${CACHE_VERSION}:${courseId}`
  if (!debug) try {
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
      } catch { /* GPS optional */ }
    }

    const payload = buildCoursePayload(course, coordinates)

    // Debug: inspect raw POI distribution
    if (debug) {
      const poiSummary = coordinates.reduce((acc: Record<number, number>, c: any) => {
        acc[c.poi] = (acc[c.poi] ?? 0) + 1
        return acc
      }, {})
      const sample = coordinates.filter((c: any) => c.hole === 1).map((c: any) => ({
        hole: c.hole, poi: c.poi, group: c.group, lat: c.latitude, lng: c.longitude
      }))
      return NextResponse.json({ poiSummary, hole1Sample: sample, polygonCount: payload.polygons.length, ...payload })
    }

    // ── 4. Write to cache (best-effort) ──────────────────────────────────
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
