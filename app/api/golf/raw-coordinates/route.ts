import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geocodeCourse, geocodeRegion, fetchGolfFeatures, type LatLng } from '@/lib/osm'
import { isOgl, stripOgl, getOpenGolfCourseRaw, getOpenGolfFeatures, findOpenGolfMatch, type OglFeatures } from '@/lib/opengolf'

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
const CACHE_VERSION    = 21  // v21: admin-placed greens merged into holes[]

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

// ── Admin-placed greens ────────────────────────────────────────────────────
// The "Place greens" tool exists for courses OSM hasn't mapped, but it lived on its own endpoint
// that only the web dashboard called — so a rescued course still opened to "GPS map not available"
// on the phone, the device actually carried round the course. Merged in here instead, so every
// client gets it off the one call.
//
// Applied per response and deliberately NOT cached: the OSM payload has a 120-day TTL, so baking
// placements into it would mean a green placed today didn't reach the app until the cache expired.
//
// Merged only into `holes` and the flat POI list. The dashboard draws its own customGreens layer
// from the separate endpoint, so adding them to `greens` as well would double-draw every flag.
// Only for holes OSM didn't map, so a placement can never displace real geometry.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withPlacedGreens(sb: any, courseId: string, payload: any) {
  try {
    const { data: override } = await sb
      .from('course_greens_override')
      .select('greens')
      .eq('course_id', courseId)
      .maybeSingle()
    const rows: unknown[] = Array.isArray(override?.greens) ? override.greens : []
    if (!rows.length) return payload

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = new Set((payload.holes ?? []).filter((h: any) => h.green).map((h: any) => h.hole))
    const placed = rows
      .map((g) => {
        const r = g as { latitude?: unknown; longitude?: unknown; hole?: unknown }
        return { hole: Number(r?.hole), latitude: Number(r?.latitude), longitude: Number(r?.longitude) }
      })
      // Rows saved before the tool recorded hole numbers hold only a click order, with nothing to
      // infer the hole from — dropped rather than guessed onto a hole and reported as a distance.
      .filter(g => Number.isInteger(g.hole) && g.hole >= 1 && g.hole <= 18 &&
                   Number.isFinite(g.latitude) && Number.isFinite(g.longitude) && !mapped.has(g.hole))
    if (!placed.length) return payload

    // A placement is a single point: no tee, outline or par goes with it. The client gets a green
    // (and a pin at the same spot) and falls back to scorecard yardage for the rest of the hole.
    const holes = [
      ...(payload.holes ?? []),
      ...placed.map(g => ({
        hole: g.hole, par: null, tee: null, tees: [] as LatLng[],
        green: { latitude: g.latitude, longitude: g.longitude },
        greenPolygon: [] as LatLng[],
        pin: { latitude: g.latitude, longitude: g.longitude },
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ].sort((a: any, b: any) => (a.hole ?? 0) - (b.hole ?? 0))

    const coordinates = [
      ...(payload.coordinates ?? []),
      ...placed.map(g => ({ type: 'green' as const, hole: g.hole, latitude: g.latitude, longitude: g.longitude })),
    ]
    // A course with nothing but placed greens still has real GPS to offer.
    return { ...payload, source: 'osm' as const, holes, coordinates, numCoordinates: coordinates.length }
  } catch {
    return payload   // table may not exist yet — no overrides
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
      if (age < CACHE_TTL_DAYS) return NextResponse.json({ ...(await withPlacedGreens(sb, courseId, cached.data)), cached: true })
    }
  } catch { /* table may not exist yet — fall through */ }

  try {
    // ── 2. Learn the course's location + name, then build search anchors ────
    let anchors: LatLng[] = []
    let targetName = ''
    let gcCity = ''
    let gcState = ''
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

    // golfcourseapi geocoding. Runs for every gc course — including one we paired to an OGL twin.
    // It used to be skipped as soon as the OGL record supplied an anchor, which left Overpass
    // scoped by OGL's single point and OGL's name. At a multi-course resort that reads as the whole
    // property: Pebble Beach came back with 14 holes instead of 18. The gc name/city/state are what
    // the user actually picked, so gather those anchors too and let name matching choose.
    if (!isOgl(courseId)) {
      // Only fatal when the OGL leg gave us nothing to fall back on.
      const bail = () => anchors.length ? null : NextResponse.json(emptyPayload(courseId))
      const detailRes = GOLF_KEY
        ? await fetch(`${GOLFCOURSE_BASE}/courses/${encodeURIComponent(courseId)}`, {
            headers: { Authorization: `Bearer ${GOLF_KEY}` },
          })
        : null
      if (!detailRes || !detailRes.ok) {
        const out = bail()
        if (out) return out
      }
      const detailJson = detailRes?.ok ? await detailRes.json() : {}
      const course = detailJson.course ?? detailJson
      const loc = course.location ?? {}
      const clubName   = course.club_name || ''
      const courseName = course.course_name || ''
      const name       = clubName || courseName
      // Prefer the golfcourseapi name for scoping — it's the course the user chose. Keep OGL's
      // only if gc gave us nothing.
      targetName = [clubName, courseName].filter(Boolean).join(' ') || targetName
      gcCity  = loc.city  ?? ''
      gcState = loc.state ?? ''
      // golfcourseapi v1.1 returns the course's own coordinates — use them as the
      // primary, authoritative anchor (no geocoding drift). Then geocode two more
      // ways as backup: the precise course-name geocode (can drift to a same-named
      // town) and the state-respecting region. Name matching picks the course,
      // robust to any single anchor being off.
      const apiAnchor: LatLng | null = (loc.latitude != null && loc.longitude != null)
        ? { latitude: Number(loc.latitude), longitude: Number(loc.longitude) }
        : null
      const [nameAnchor, region] = await Promise.all([
        geocodeCourse(name, loc.city ?? '', loc.state ?? '', loc.country ?? ''),
        geocodeRegion(loc.city ?? '', loc.state ?? '', loc.country ?? ''),
      ])
      // Keep any OGL anchor from above, but put the gc ones alongside it.
      anchors = [...anchors, apiAnchor, nameAnchor, region].filter(Boolean) as LatLng[]
    }

    if (!anchors.length) {
      // Nothing to anchor on — return a null center; don't cache, retry next time.
      return NextResponse.json(await withPlacedGreens(sb, courseId, { ...emptyPayload(courseId), center: null, centerSource: null }))
    }

    // ── 3. Overpass → green / tee / pin positions (scoped to this course) ──
    const osm = await fetchGolfFeatures(anchors, targetName)

    // Fallback: a scorecard-only course we couldn't pair at search time, whose
    // Overpass query found no greens. Resolve it to an OpenGolfAPI course by
    // name + location and use its /features greens — they catch greens our
    // area-scoped query misses. Only when we'd otherwise show nothing, so it can
    // never regress a course that already works.
    if (!oglFeatures && osm.greens.length === 0 && !isOgl(courseId) && targetName) {
      const matchId = await findOpenGolfMatch(targetName, gcCity, gcState)
      if (matchId) oglFeatures = await getOpenGolfFeatures(matchId)
    }

    // Flags: prefer OpenGolfAPI's course-scoped green centroids when it has them
    // (clean and on-green), and fall back to the Overpass greens only for courses
    // /features doesn't cover. Overpass grabs greens by area, so it can pull in
    // mis-tagged or neighbouring-course shapes that flag off in the rough; using
    // OGL as the source drops those strays. No size/shape filtering — just source
    // preference — so a real green is never dropped for being an odd shape.
    // A single course has at most ~27 greens (a 27-hole facility). Well past that, /features is
    // describing a whole resort rather than this course — Pebble Beach came back with 91 — and
    // adopting it scatters flags across neighbouring courses. In that case keep the area-scoped
    // Overpass greens, unless Overpass found nothing at all, where too many beats none.
    const MAX_COURSE_GREENS = 30
    let greens = osm.greens
    let bunkers = osm.bunkers
    let water = osm.water
    if (oglFeatures) {
      const oglGreens = oglFeatures.greens.map(g => g.center)
      const resortWide = oglGreens.length > MAX_COURSE_GREENS
      if (oglGreens.length && (!resortWide || osm.greens.length === 0)) {
        greens = oglGreens
      }
      // Hazards are only ever additive detail on the map, but scope them the same way so a
      // resort-wide feature set doesn't paint bunkers over the neighbouring course either.
      if (oglFeatures.bunkers.length && !resortWide) bunkers = oglFeatures.bunkers
      if (oglFeatures.water.length   && !resortWide) water   = oglFeatures.water
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
      holes:          [
        ...osm.holes.map(h => ({
          hole:         h.ref,
          par:          h.par,
          tee:          h.tee,          // primary (back) tee
          tees:         h.tees,         // every tee box, back → forward
          green:        h.green,        // centroid
          greenPolygon: h.greenPolygon, // outline → app computes front/center/back
          pin:          h.pin,          // exact flag when mapped (else green centroid)
        })),
      ],
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
    return NextResponse.json(await withPlacedGreens(sb, courseId, payload))
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
