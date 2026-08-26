import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geocodeCourse, geocodeRegion, fetchGolfFeatures, type LatLng } from '@/lib/osm'
import { isOgl, stripOgl, getOpenGolfCourseRaw, getOpenGolfFeatures, type OglFeatures } from '@/lib/opengolf'

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
const CACHE_VERSION    = 14  // v14: flags placed on green polygons (sized, deduped, single-source)

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

  // Optional OpenGolfAPI id for a golfcourseapi course we matched at search time
  // (hybrid): lets a gc course pull OGL's /features flags + GPS. Accepts the
  // ogl_<uuid> form or a bare uuid.
  const oglParam = req.nextUrl.searchParams.get('ogl') ?? ''
  const oglId = isOgl(courseId) ? stripOgl(courseId)
    : oglParam ? (isOgl(oglParam) ? stripOgl(oglParam) : oglParam)
    : ''

  const GOLF_KEY = process.env.GOLFCOURSE_API_KEY
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Cache (OSM geometry is effectively static) ────────────────────────
  // Key includes the OGL id so an enriched result never collides with a plain
  // (pre-hybrid) one for the same golfcourseapi course.
  const cacheKey = `v${CACHE_VERSION}:${courseId}${oglId && !isOgl(courseId) ? `:ogl:${oglId}` : ''}`
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

  try {
    // ── 2. Learn the course's location + name, then build search anchors ────
    let anchors: LatLng[] = []
    let targetName = ''
    let oglFeatures: OglFeatures | null = null

    if (oglId) {
      // OpenGolfAPI-backed — either a native ogl_ course, or a golfcourseapi
      // course we matched to an OGL id at search time. It carries lat/lng, so we
      // skip geocoding, and pull its pre-classified /features surfaces (greens,
      // bunkers, water) so every mapped green gets a flag without depending on
      // the geocode/area-match resolving.
      const [raw, feats] = await Promise.all([
        getOpenGolfCourseRaw(oglId),
        getOpenGolfFeatures(oglId),
      ])
      oglFeatures = feats
      if (raw?.latitude != null && raw?.longitude != null) {
        anchors = [{ latitude: raw.latitude, longitude: raw.longitude }]
      }
      targetName = raw?.name || raw?.course_name || ''
    }

    // golfcourseapi geocoding — for a pure gc course, or as a fallback when the
    // matched OGL record carried no coordinates. Skipped once we already have an
    // OGL anchor above.
    if (!anchors.length && !isOgl(courseId)) {
      if (!GOLF_KEY) return NextResponse.json(emptyPayload(courseId))
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
      targetName = [clubName, courseName].filter(Boolean).join(' ')
      // Geocode two ways and search near BOTH: the precise course-name geocode
      // (can drift to a same-named town in another state) and the state-respecting
      // region (a town name like "Fairfield" is itself ambiguous). Name matching
      // then picks the course, robust to either geocode being off.
      const [nameAnchor, region] = await Promise.all([
        geocodeCourse(name, loc.city ?? '', loc.state ?? '', loc.country ?? ''),
        geocodeRegion(loc.city ?? '', loc.state ?? '', loc.country ?? ''),
      ])
      anchors = [nameAnchor, region].filter(Boolean) as LatLng[]
    }

    if (!anchors.length) {
      // Nothing to anchor on — return a null center; don't cache, retry next time.
      return NextResponse.json({ ...emptyPayload(courseId), center: null, centerSource: null })
    }

    // ── 3. Overpass → green / tee / pin positions (scoped to this course) ──
    const osm = await fetchGolfFeatures(anchors, targetName)

    // Flags are drawn once per green, ON the green. Pick the cleaner single
    // source — OpenGolfAPI's typed, course-scoped greens when we have them, else
    // Overpass — keep only plausibly-green-sized polygons, place the flag at the
    // polygon centroid, and merge near-duplicates. (Unioning the two sources
    // doubled flags and let stray/mis-tagged polygons land off the greens.)
    const greenPolys: LatLng[][] = (oglFeatures?.greens.length
      ? oglFeatures.greens.map(g => g.polygon)
      : osm.greenPolys
    ).filter(p => p && p.length >= 3)
    let greens = cleanGreens(greenPolys)
    // Safety net: never let filtering strip a course of all its flags.
    if (!greens.length) {
      greens = oglFeatures?.greens.length ? oglFeatures.greens.map(g => g.center) : osm.greens
    }
    let bunkers = osm.bunkers
    let water = osm.water
    if (oglFeatures) {
      if (oglFeatures.bunkers.length) bunkers = oglFeatures.bunkers
      if (oglFeatures.water.length)   water = oglFeatures.water
    }

    const hasGeo = greens.length + osm.tees.length + osm.pins.length + osm.holes.length > 0

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
    for (const g of greens) if (!seen(holeGreens, g)) flat.push({ type: 'green', hole: null, latitude: g.latitude, longitude: g.longitude })
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
      greens:         greens,        // Overpass ∪ OpenGolfAPI (flags drawn here)
      tees:           osm.tees,
      pins:           osm.pins,
      bunkers:        bunkers,       // sand hazard outlines
      water:          water,         // water hazard outlines
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

// A golf green is ~200–1000 m²; allow a generous band so odd-but-real greens
// pass while a mis-tagged fairway/practice area (too big) or a stray scrap (too
// small) is dropped. Greens whose flags fall within GREEN_MERGE_M are one green.
const GREEN_MIN_M2 = 60
const GREEN_MAX_M2 = 4000
const GREEN_MERGE_M = 25

function distM(a: LatLng, b: LatLng): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude), dLng = toRad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Planar polygon area in m² (equirectangular about the ring — fine at green scale).
function polyAreaM2(pts: LatLng[]): number {
  if (pts.length < 3) return 0
  const lat0 = (pts.reduce((s, p) => s + p.latitude, 0) / pts.length) * Math.PI / 180
  const mLat = 111_320, mLng = 111_320 * Math.cos(lat0)
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % pts.length]
    a += (p0.longitude * mLng) * (p1.latitude * mLat) - (p1.longitude * mLng) * (p0.latitude * mLat)
  }
  return Math.abs(a) / 2
}

// Area-weighted polygon centroid (on the green for a convex-ish ring).
function polyCentroid(pts: LatLng[]): LatLng | null {
  if (pts.length < 3) return null
  let twiceArea = 0, cx = 0, cy = 0
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % pts.length]
    const cross = p0.longitude * p1.latitude - p1.longitude * p0.latitude
    twiceArea += cross
    cx += (p0.longitude + p1.longitude) * cross
    cy += (p0.latitude + p1.latitude) * cross
  }
  if (Math.abs(twiceArea) < 1e-12) {
    return { latitude:  pts.reduce((s, p) => s + p.latitude, 0) / pts.length,
             longitude: pts.reduce((s, p) => s + p.longitude, 0) / pts.length }
  }
  return { latitude: cy / (3 * twiceArea), longitude: cx / (3 * twiceArea) }
}

// Green outlines → one on-green flag point each: drop implausible sizes, place the
// flag at the centroid, and merge points closer than GREEN_MERGE_M.
function cleanGreens(polys: LatLng[][]): LatLng[] {
  const kept: LatLng[] = []
  for (const poly of polys) {
    if (poly.length < 3) continue
    const area = polyAreaM2(poly)
    if (area < GREEN_MIN_M2 || area > GREEN_MAX_M2) continue
    const c = polyCentroid(poly)
    if (!c) continue
    if (kept.some(k => distM(k, c) < GREEN_MERGE_M)) continue
    kept.push(c)
  }
  return kept
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
