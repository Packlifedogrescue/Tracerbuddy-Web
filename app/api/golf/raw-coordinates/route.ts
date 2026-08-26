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
const CACHE_VERSION    = 16  // v16: restore Overpass ∪ OpenGolfAPI green centroids for flags (PR #12 behavior)

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

    // Flags: union the Overpass greens with OpenGolfAPI's green centroids. Overpass
    // alone is empty for some courses (Cumberland included) — their greens come
    // from /features — so both sources are needed. Deduped by proximity (~11 m) so
    // a single green never gets two flags. Each OGL centroid is the green's own
    // center, so a flag here lands on the green.
    let greens = osm.greens
    let bunkers = osm.bunkers
    let water = osm.water
    if (oglFeatures) {
      if (oglFeatures.greens.length) {
        greens = unionGreens(osm.greens, oglFeatures.greens.map(g => g.center))
      }
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

// Union two green-centroid lists, dropping any within ~11 m of one already kept
// so a single green never gets two flags.
function unionGreens(a: LatLng[], b: LatLng[]): LatLng[] {
  const out = [...a]
  for (const p of b) if (!out.some(q => near(q, p))) out.push(p)
  return out
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
