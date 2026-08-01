import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE      = 'https://golfapi.io/api/v2.3'
const CACHE_TTL_DAYS = 30
const CACHE_VERSION  = 5

// POI types from the coordinates endpoint
const POI_GREEN     = 1
const POI_FAIRWAY   = 2
const POI_ROUGH     = 3
const POI_BUNKER    = 4
const POI_WATER     = 5
const POI_OB        = 6  // out of bounds
const POI_DOGLEG    = 9  // ordered waypoints along the fairway path — confirmed against live
                          // data: poi 9 appears wherever dogleg-shaped holes are mapped, poi 7
                          // never appears at all, so Waypoints has been silently empty for
                          // every course since this route was added
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

// Initial bearing in degrees from point 1 to point 2
function bearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// Destination point given a start point, bearing (degrees), and distance (yards)
function destinationPoint(lat: number, lon: number, bearingDeg: number, yards: number): { lat: number; lng: number } {
  const R = 6371000
  const δ = (yards / 1.09361) / R
  const θ = bearingDeg * Math.PI / 180
  const φ1 = lat * Math.PI / 180, λ1 = lon * Math.PI / 180
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  )
  return { lat: φ2 * 180 / Math.PI, lng: λ2 * 180 / Math.PI }
}

function buildCoursePayload(course: any, coordinates: any[]) {
  const parsMen       = course.parsMen       ?? []
  const indexesMen    = course.indexesMen    ?? []
  const parsFemale    = course.parsFemale    ?? []
  const indexesFemale = course.indexesFemale ?? []
  const firstTee      = course.tees?.[0]     ?? {}
  const mainTee       = course.tees?.find((t: any) => /blue|champ|black|gold/i.test(t.teeName ?? '')) ?? firstTee

  const holeCoords: Record<number, {
    tLat?: string; tLng?: string; gLat?: string; gLng?: string
    gFrontLat?: string; gFrontLng?: string; gBackLat?: string; gBackLng?: string
  }> = {}
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

  // Average green POI points per hole → true green center. When the tee is known too,
  // also take the closest/farthest green point from the tee as front/back of green — the
  // green points aren't labeled front/back individually, but their spread along the
  // approach line is a reasonable stand-in for green depth.
  for (const [h, pts] of Object.entries(holeGreenPoints)) {
    if (pts.length === 0) continue
    const hole = Number(h)
    const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
    const avgLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length
    holeCoords[hole].gLat = String(avgLat)
    holeCoords[hole].gLng = String(avgLng)

    const tLat = holeCoords[hole].tLat ? Number(holeCoords[hole].tLat) : null
    const tLng = holeCoords[hole].tLng ? Number(holeCoords[hole].tLng) : null
    if (tLat != null && tLng != null && pts.length > 1) {
      const byDist = pts.map(p => ({ p, d: yardsFromCoords(tLat, tLng, p.lat, p.lng) }))
        .sort((a, b) => a.d - b.d)
      const front = byDist[0].p, back = byDist[byDist.length - 1].p
      holeCoords[hole].gFrontLat = String(front.lat); holeCoords[hole].gFrontLng = String(front.lng)
      holeCoords[hole].gBackLat  = String(back.lat);  holeCoords[hole].gBackLng  = String(back.lng)
    }
  }

  // 100/150/200y markers: computed geometrically along the tee→green-center line rather
  // than from a dedicated POI type (GolfAPI's coordinates endpoint doesn't have one) — a
  // marker N yards out is just the point N yards short of the green along that bearing.
  const markerDistances = [100, 150, 200]
  const holeMarkers: Record<number, Record<number, { lat: number; lng: number }>> = {}
  for (const [h, coords] of Object.entries(holeCoords)) {
    if (!coords.tLat || !coords.tLng || !coords.gLat || !coords.gLng) continue
    const tLat = Number(coords.tLat), tLng = Number(coords.tLng)
    const gLat = Number(coords.gLat), gLng = Number(coords.gLng)
    const totalYards = yardsFromCoords(tLat, tLng, gLat, gLng)
    const bearing = bearingDegrees(tLat, tLng, gLat, gLng)
    holeMarkers[Number(h)] = {}
    for (const m of markerDistances) {
      if (totalYards <= m) continue
      holeMarkers[Number(h)][m] = destinationPoint(tLat, tLng, bearing, totalYards - m)
    }
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
    const markers = holeMarkers[holeNo] ?? {}
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
      GreenFrontLatitude:  coords.gFrontLat ?? null,
      GreenFrontLongitude: coords.gFrontLng ?? null,
      GreenBackLatitude:   coords.gBackLat  ?? null,
      GreenBackLongitude:  coords.gBackLng  ?? null,
      Marker100:       markers[100] ?? null,
      Marker150:       markers[150] ?? null,
      Marker200:       markers[200] ?? null,
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
