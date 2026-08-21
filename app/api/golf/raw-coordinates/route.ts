import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geocodeCourse, fetchGolfFeatures, type LatLng } from '@/lib/osm'

// The OSM lookup (geocode + Overpass, with mirror failover) can take a while on
// a cold course, so give the function room rather than letting Vercel's short
// default kill it mid-fetch and blank the map.
export const runtime = 'nodejs'
export const maxDuration = 60

// GET /api/golf/raw-coordinates?id=COURSE_ID
//
// GPS for the AI caddie, sourced free from OpenStreetMap (phase 2). golfcourseapi
// gives us the course name + city/state but no coordinates, so we:
//   1. read the scorecard (cached) to learn the course's name/location,
//   2. geocode it with Nominatim to a lat/lng anchor,
//   3. pull green / tee / pin positions from Overpass around that anchor.
//
// OSM data is community-run and rate-limited, so the whole result is cached in
// Supabase for a long time (course geometry doesn't move). If a course isn't in
// OSM we return source:'none' with empty lists — the app degrades to no-GPS
// rather than erroring.
//
// Output shape:
//   { courseID, source, center, numCoordinates,
//     holes:  [{ hole, par, tee, green, pin }],   // per-hole where OSM maps it
//     greens: [LatLng], tees: [LatLng], pins: [LatLng],
//     coordinates: [{ type, hole, latitude, longitude }] }  // flat POI list
// The flat `coordinates` list powers "nearest green" (filter type==='green'|'pin');
// `holes` powers per-hole distance where hole numbers are available.
const GOLFCOURSE_BASE = 'https://api.golfcourseapi.com/v1'
const CACHE_TTL_DAYS   = 120
const CACHE_VERSION    = 7  // v7: orient hole-ways by green proximity (fix reversed ways)

interface FlatPoi { type: 'green' | 'tee' | 'pin'; hole: number | null; latitude: number; longitude: number }

function emptyPayload(courseId: string) {
  return {
    courseID:       courseId,
    source:         'none' as const,
    centerSource:   null as null | 'course' | 'town',
    center:         null,
    numCoordinates: 0,
    holes:          [],
    greens:         [],
    tees:           [],
    pins:           [],
    coordinates:    [] as FlatPoi[],
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

  // ── 1. Cache (OSM geometry is effectively static) ────────────────────────
  const cacheKey = `v${CACHE_VERSION}:${courseId}`
  try {
    const { data: cached } = await sb
      .from('golf_osm_cache')
      .select('data, cached_at')
      .eq('course_id', cacheKey)
      .maybeSingle()
    // Only trust a cached HIT (real GPS). A cached "none" is never served — a
    // transient OSM hiccup must not blank a course for the whole TTL — so we fall
    // through and retry the lookup instead.
    if (cached && cached.data?.source === 'osm') {
      const age = (Date.now() - new Date(cached.cached_at).getTime()) / 86_400_000
      if (age < CACHE_TTL_DAYS) return NextResponse.json({ ...cached.data, cached: true })
    }
  } catch { /* table may not exist yet — fall through */ }

  if (!GOLF_KEY) {
    // Without the scorecard we can't learn the course name to geocode.
    return NextResponse.json(emptyPayload(courseId))
  }

  try {
    // ── 2. Learn the course's name/location from golfcourseapi ─────────────
    const detailRes = await fetch(`${GOLFCOURSE_BASE}/courses/${encodeURIComponent(courseId)}`, {
      headers: { Authorization: `Bearer ${GOLF_KEY}` },
    })
    if (!detailRes.ok) return NextResponse.json(emptyPayload(courseId))
    const detailJson = await detailRes.json()
    const course = detailJson.course ?? detailJson
    const loc = course.location ?? {}
    const clubName   = course.club_name || ''
    const courseName = course.course_name || ''
    const name       = clubName || courseName
    // For area matching we want both the facility name AND the course label
    // (e.g. "Pinehurst Resort" + "No. 2"), so a resort's courses disambiguate.
    const targetName = [clubName, courseName].filter(Boolean).join(' ')

    // ── 3. Geocode → anchor ────────────────────────────────────────────────
    const anchor = await geocodeCourse(name, loc.city ?? '', loc.state ?? '', loc.country ?? '')
    if (!anchor) {
      // The course name didn't geocode (likely not a notable place / not in OSM). Fall back to a
      // TOWN-level center so the app can at least frame the general area — but do NOT run Overpass
      // from the town, or we could attach a neighboring course's holes to this one.
      const areaCenter = await geocodeCourse('', loc.city ?? '', loc.state ?? '', loc.country ?? '')
      // Don't cache a "none" — retry next time in case geocoding recovers.
      return NextResponse.json({
        ...emptyPayload(courseId),
        center: areaCenter,
        centerSource: areaCenter ? ('town' as const) : null,
      })
    }

    // ── 4. Overpass → green / tee / pin positions (scoped to this course) ──
    const osm = await fetchGolfFeatures(anchor, targetName)
    const hasGeo = osm.greens.length + osm.tees.length + osm.pins.length + osm.holes.length > 0

    const flat: FlatPoi[] = []
    // Prefer per-hole points where OSM mapped hole numbers…
    for (const h of osm.holes) {
      if (h.green) flat.push({ type: 'green', hole: h.ref, latitude: h.green.latitude, longitude: h.green.longitude })
      if (h.tee)   flat.push({ type: 'tee',   hole: h.ref, latitude: h.tee.latitude,   longitude: h.tee.longitude })
      if (h.pin)   flat.push({ type: 'pin',   hole: h.ref, latitude: h.pin.latitude,   longitude: h.pin.longitude })
    }
    // …plus any raw greens/pins not already attached to a hole (dedupe by proximity).
    const seen = (list: LatLng[], p: LatLng) => list.some(q => near(q, p))
    const holeGreens = osm.holes.map(h => h.green).filter(Boolean) as LatLng[]
    const holePins   = osm.holes.map(h => h.pin).filter(Boolean) as LatLng[]
    for (const g of osm.greens) if (!seen(holeGreens, g)) flat.push({ type: 'green', hole: null, latitude: g.latitude, longitude: g.longitude })
    for (const p of osm.pins)   if (!seen(holePins, p))   flat.push({ type: 'pin',   hole: null, latitude: p.latitude,  longitude: p.longitude })

    const payload = {
      courseID:       courseId,
      source:         hasGeo ? ('osm' as const) : ('none' as const),
      // The anchor is the course's own geocode, so the center is course-level
      // even when no hole geometry was found — enough to frame a satellite view.
      centerSource:   'course' as const,
      matchedCourse:  osm.matchedCourse,
      center:         osm.center,
      numCoordinates: flat.length,
      holes:          osm.holes.map(h => ({
        hole:         h.ref,
        par:          h.par,
        tee:          h.tee,          // primary (back) tee
        tees:         h.tees,         // every tee box, back → forward
        green:        h.green,        // centroid
        greenPolygon: h.greenPolygon, // outline → app computes front/center/back
        pin:          h.pin,          // exact flag when mapped (else green centroid)
      })),
      greens:         osm.greens,
      tees:           osm.tees,
      pins:           osm.pins,
      coordinates:    flat,
    }

    // Cache only real GPS hits — never a "none", so a transient Overpass failure
    // can't poison a course that actually has data.
    if (payload.source === 'osm') await writeCache(sb, cacheKey, payload)
    return NextResponse.json(payload)
  } catch (e) {
    // Never hard-fail — the app must be able to fall back to no-GPS.
    return NextResponse.json({ ...emptyPayload(courseId), error: String(e) })
  }
}

function near(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.latitude - b.latitude) < 1e-4 && Math.abs(a.longitude - b.longitude) < 1e-4
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeCache(sb: any, key: string, data: unknown) {
  try {
    await sb.from('golf_osm_cache').upsert({
      course_id: key,
      data,
      cached_at: new Date().toISOString(),
    })
  } catch { /* best-effort */ }
}
