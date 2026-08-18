// OpenStreetMap GPS layer for golf courses.
//
// golfcourseapi.com gives us scorecards but no coordinates. Rather than pay for
// a GPS provider, we pull green / tee / pin positions from OpenStreetMap for
// free via two public, no-key services:
//
//   1. Nominatim  — geocode "<club name>, <city>, <state>" → a lat/lng anchor.
//   2. Overpass   — fetch all golf features (holes, greens, tees, pins).
//
// Both are community-run and rate-limited, so every result is cached hard in
// Supabase (course geometry never changes). Both also REQUIRE a descriptive
// User-Agent with contact info or they return 403 — do not remove it.
//
// MULTI-COURSE FACILITIES: a resort like Pinehurst has 9+ courses inside one
// tight footprint, each with its own hole 1..18. A naive radius query mixes them
// all together (three "hole 1"s), which is worse than useless for distances. So
// we first enumerate the golf_course AREAS near the anchor, pick the one whose
// name/number matches the golfcourseapi course, and scope features to THAT area
// only. A standalone course has exactly one area, so this is a no-op there.
//
// OSM golf tagging (https://wiki.openstreetmap.org/wiki/Tag:leisure%3Dgolf_course):
//   golf=hole   a way, tagged ref=<hole #> and par; drawn tee → green.
//   golf=green  a polygon (the putting green).
//   golf=tee    a polygon (the teeing ground).
//   golf=pin    a node (the exact flag position) — best distance-to-pin source.
//
// The hole-way is the reliable per-hole anchor: its `ref` is the hole number and
// its first / last vertices are the tee and green. Greens and pins usually carry
// NO hole number, so we snap them to the nearest hole-way endpoint instead of
// trusting an (absent) ref.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
// Nominatim's usage policy requires a real UA identifying the app + contact.
const USER_AGENT = 'TracerBuddy/1.0 (https://tracerbuddy.app; brett@tracerbuddy.com)'

export interface LatLng { latitude: number; longitude: number }
export interface OsmHole {
  ref: number | null
  par: number | null
  tee: LatLng | null
  green: LatLng | null
  pin: LatLng | null
}
export interface OsmResult {
  center: LatLng | null
  matchedCourse: string | null   // OSM area name we scoped to (for debugging)
  holes: OsmHole[]
  greens: LatLng[]
  tees: LatLng[]
  pins: LatLng[]
}

// ── geometry helpers ───────────────────────────────────────────────────────

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Area-weighted centroid of a small polygon (planar approximation is fine at
// green scale). Falls back to the vertex mean for degenerate rings.
function centroid(pts: LatLng[]): LatLng | null {
  if (!pts.length) return null
  if (pts.length < 3) {
    const n = pts.length
    return {
      latitude:  pts.reduce((s, p) => s + p.latitude, 0) / n,
      longitude: pts.reduce((s, p) => s + p.longitude, 0) / n,
    }
  }
  let twiceArea = 0, cx = 0, cy = 0
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i]
    const p1 = pts[(i + 1) % pts.length]
    const cross = p0.longitude * p1.latitude - p1.longitude * p0.latitude
    twiceArea += cross
    cx += (p0.longitude + p1.longitude) * cross
    cy += (p0.latitude + p1.latitude) * cross
  }
  if (Math.abs(twiceArea) < 1e-12) {
    const n = pts.length
    return {
      latitude:  pts.reduce((s, p) => s + p.latitude, 0) / n,
      longitude: pts.reduce((s, p) => s + p.longitude, 0) / n,
    }
  }
  return { latitude: cy / (3 * twiceArea), longitude: cx / (3 * twiceArea) }
}

function nearest(target: LatLng, candidates: LatLng[], maxMeters: number): LatLng | null {
  let best: LatLng | null = null
  let bestD = Infinity
  for (const c of candidates) {
    const d = haversine(target, c)
    if (d < bestD) { bestD = d; best = c }
  }
  return bestD <= maxMeters ? best : null
}

// ── name / number matching (disambiguates courses at a resort) ───────────────

const STOP = new Set([
  'the', 'golf', 'course', 'club', 'resort', 'country', 'and', 'at', 'of',
  'links', 'no', 'number', 'cc', 'gc', 'g', 'c',
])

function tokens(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP.has(t))
}

// Extract a course number where a facility numbers its courses ("No. 2", "#4",
// "Course 8", "Number 3", or a bare trailing "... 2").
function courseNumber(name: string): number | null {
  const s = (name || '').toLowerCase()
  const m = s.match(/(?:no\.?|number|course|#)\s*\.?\s*(\d{1,2})\b/)
  if (m) return parseInt(m[1], 10)
  const m2 = s.match(/\b(\d{1,2})\b\s*$/)
  if (m2) return parseInt(m2[1], 10)
  return null
}

function nameScore(target: string, cand: string): number {
  const t = new Set(tokens(target))
  const c = tokens(cand)
  if (!c.length || !t.size) return 0
  let hit = 0
  for (const w of c) if (t.has(w)) hit++
  return hit / Math.max(t.size, c.length)
}

// ── step 1: geocode ──────────────────────────────────────────────────────────

export async function geocodeCourse(
  name: string, city: string, state: string, country: string,
): Promise<LatLng | null> {
  const q = [name, city, state, country].filter(Boolean).join(', ')
  if (!q) return null
  const url = `${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } })
    if (!res.ok) return null
    const arr = await res.json()
    if (!Array.isArray(arr) || !arr.length) return null
    const lat = parseFloat(arr[0].lat)
    const lng = parseFloat(arr[0].lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    return { latitude: lat, longitude: lng }
  } catch {
    return null
  }
}

// ── step 2: overpass ─────────────────────────────────────────────────────────

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
  geometry?: { lat: number; lon: number }[]
}

async function runOverpass(query: string): Promise<OverpassElement[] | null> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!res.ok) continue
      const json = await res.json()
      if (Array.isArray(json.elements)) return json.elements
    } catch {
      // try the next mirror
    }
  }
  return null
}

interface CourseArea { kind: 'way' | 'relation'; id: number; name: string; center: LatLng | null }

// Enumerate golf_course areas near the anchor and pick the one matching the
// target course. Returns null if none are found (→ radius fallback).
async function findCourseArea(anchor: LatLng, targetName: string): Promise<CourseArea | null> {
  const q = `[out:json][timeout:30];
(
  way[leisure=golf_course](around:1600,${anchor.latitude},${anchor.longitude});
  relation[leisure=golf_course](around:1600,${anchor.latitude},${anchor.longitude});
);
out tags center;`
  const els = await runOverpass(q)
  if (!els || !els.length) return null

  const areas: CourseArea[] = els
    .filter(e => e.type === 'way' || e.type === 'relation')
    .map(e => ({
      kind: e.type as 'way' | 'relation',
      id: e.id,
      name: e.tags?.name ?? '',
      center: e.center ? { latitude: e.center.lat, longitude: e.center.lon } : null,
    }))
  if (!areas.length) return null
  if (areas.length === 1) return areas[0]   // standalone course — no ambiguity

  const targetNum = courseNumber(targetName)
  let best = areas[0]
  let bestScore = -Infinity
  for (const a of areas) {
    let score = nameScore(targetName, a.name)
    const aNum = courseNumber(a.name)
    if (targetNum != null && aNum != null) score += aNum === targetNum ? 1.0 : -0.6
    // Tiebreak toward the area nearest the geocoded anchor.
    if (a.center) score -= haversine(anchor, a.center) / 100_000
    if (score > bestScore) { bestScore = score; best = a }
  }
  return best
}

async function fetchFeaturesInArea(area: CourseArea): Promise<OverpassElement[] | null> {
  const selector = area.kind === 'way' ? `way(${area.id})` : `relation(${area.id})`
  const q = `[out:json][timeout:40];
${selector};
map_to_area->.ca;
(
  way(area.ca)[golf=hole];
  way(area.ca)[golf=green];
  way(area.ca)[golf=tee];
  node(area.ca)[golf=pin];
);
out geom tags;`
  return runOverpass(q)
}

function radiusQuery(lat: number, lng: number): string {
  return `[out:json][timeout:40];
(
  way[golf=hole](around:1200,${lat},${lng});
  way[golf=green](around:1200,${lat},${lng});
  way[golf=tee](around:1200,${lat},${lng});
  node[golf=pin](around:1200,${lat},${lng});
);
out geom tags;`
}

function parseElements(elements: OverpassElement[]): Omit<OsmResult, 'center' | 'matchedCourse'> {
  const holeWays: { ref: number | null; par: number | null; tee: LatLng | null; green: LatLng | null }[] = []
  const greens: LatLng[] = []
  const tees: LatLng[] = []
  const pins: LatLng[] = []

  for (const el of elements) {
    const tags = el.tags ?? {}
    const golf = tags.golf
    if (golf === 'pin' && el.lat != null && el.lon != null) {
      pins.push({ latitude: el.lat, longitude: el.lon })
      continue
    }
    const geom = (el.geometry ?? []).map(g => ({ latitude: g.lat, longitude: g.lon }))
    if (!geom.length) continue
    if (golf === 'green') {
      const c = centroid(geom); if (c) greens.push(c)
    } else if (golf === 'tee') {
      const c = centroid(geom); if (c) tees.push(c)
    } else if (golf === 'hole') {
      const ref = tags.ref ? parseInt(tags.ref, 10) : NaN
      const par = tags.par ? parseInt(tags.par, 10) : NaN
      holeWays.push({
        ref: Number.isNaN(ref) ? null : ref,
        par: Number.isNaN(par) ? null : par,
        tee:   geom[0] ?? null,
        green: geom[geom.length - 1] ?? null,
      })
    }
  }

  // Snap the precise green centroid and the exact pin onto each hole's green end
  // (within 60 m) rather than trusting an absent ref. Then sort by hole number.
  const holes: OsmHole[] = holeWays.map(hw => {
    const greenPt = hw.green ? (nearest(hw.green, greens, 60) ?? hw.green) : null
    const pin = greenPt ? nearest(greenPt, pins, 60) : null
    const tee = hw.tee ? (nearest(hw.tee, tees, 60) ?? hw.tee) : null
    return { ref: hw.ref, par: hw.par, tee, green: greenPt, pin }
  })
  holes.sort((a, b) => {
    if (a.ref == null) return 1
    if (b.ref == null) return -1
    return a.ref - b.ref
  })

  return { holes, greens, tees, pins }
}

export async function fetchGolfFeatures(anchor: LatLng, targetName: string): Promise<OsmResult> {
  let elements: OverpassElement[] | null = null
  let matchedCourse: string | null = null
  let center = anchor

  const area = await findCourseArea(anchor, targetName)
  if (area) {
    elements = await fetchFeaturesInArea(area)
    matchedCourse = area.name || null
    if (area.center) center = area.center
  }
  // Fall back to a tight radius only if we couldn't resolve/scope an area.
  if (!elements || elements.length === 0) {
    elements = await runOverpass(radiusQuery(anchor.latitude, anchor.longitude))
  }
  if (!elements) return { center, matchedCourse, holes: [], greens: [], tees: [], pins: [] }
  return { center, matchedCourse, ...parseElements(elements) }
}
