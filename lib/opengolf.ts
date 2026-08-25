// OpenGolfAPI (opengolfapi.org) — a free, no-key, structured API over
// OpenStreetMap golf data. We use it alongside golfcourseapi: it brings broad
// coverage + course GPS (lat/lng) and par-per-hole scorecards, while
// golfcourseapi brings the richer per-tee yardages/ratings. Data is © OpenStreetMap
// contributors (ODbL) — the map credits OSM accordingly.
//
// Its course IDs are UUIDs; we prefix them with "ogl_" so the golf routes can
// tell which provider a course came from and fetch detail/GPS from the right one.

import type { LatLng } from './osm'

const OPENGOLF_BASE = 'https://api.opengolfapi.org/v1'
// The features endpoint lives under a different path prefix (/api/v1) and is
// queried by course UUID: it returns pre-classified OSM surfaces (greens,
// bunkers, water, fairways…) already scoped to the course.
const OPENGOLF_FEATURES = 'https://api.opengolfapi.org/api/v1/features'
export const OGL_PREFIX = 'ogl_'

export const isOgl = (id: string) => id.startsWith(OGL_PREFIX)
export const stripOgl = (id: string) => id.slice(OGL_PREFIX.length)

// The core course endpoints are free (no key). The key only lifts rate limits /
// unlocks premium endpoints — send it when present. Accept the user's env name
// (GOLFCOURSE_API_KEY1) as well as the tidy one.
const OPENGOLF_KEY = process.env.OPENGOLF_API_KEY || process.env.GOLFCOURSE_API_KEY1 || ''

// tee color name → swatch hex (matches the course route's palette)
const OGL_TEE_HEX: Record<string, string> = {
  black: '#111111', blue: '#3B82F6', white: '#E5E7EB', gold: '#D4AF37',
  yellow: '#FBBF24', red: '#EF4444', green: '#22A06B', silver: '#C0C0C0',
  gray: '#9CA3AF', grey: '#9CA3AF', orange: '#F97316', purple: '#A855F7',
  championship: '#111111', combo: '#8B7355', black_blue: '#1E3A8A',
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

async function fetchJson(url: string, ms = 8000): Promise<any | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (OPENGOLF_KEY) headers.Authorization = `Bearer ${OPENGOLF_KEY}`
    const res = await fetch(url, { signal: ctrl.signal, headers })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// Per-hole detail (par, handicap, per-tee yardages) — the rich scorecard source.
export async function getOpenGolfHoles(id: string): Promise<any[] | null> {
  const data = await fetchJson(`${OPENGOLF_BASE}/courses/${encodeURIComponent(id)}/holes`)
  return Array.isArray(data?.holes) ? data.holes : null
}

// Tee ratings (course rating + slope, per color and gender).
export async function getOpenGolfTees(id: string): Promise<any[] | null> {
  const data = await fetchJson(`${OPENGOLF_BASE}/courses/${encodeURIComponent(id)}/tees`)
  return Array.isArray(data?.tees) ? data.tees : null
}

// ── /features: pre-classified course surfaces (for RENDERING only) ───────────
// Same underlying OSM data as Overpass (source:"osm", ODbL), but typed by
// feature_type and already scoped to the course UUID — so it needs no geocode,
// area-match or tag-matching to render. We use it to give every mapped green a
// flag; per-hole flags/distances still come from the Overpass golf=hole pipeline
// (this endpoint carries hole_number:null on every feature).

// GeoJSON ring ([[lng,lat], …]) → the app's LatLng[].
function ringToLatLng(ring: unknown): LatLng[] {
  if (!Array.isArray(ring)) return []
  const out: LatLng[] = []
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2) continue
    const lat = Number(p[1]), lng = Number(p[0])
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ latitude: lat, longitude: lng })
  }
  return out
}

// Outer rings of a Polygon / MultiPolygon geometry.
function outerRings(geom: any): LatLng[][] {
  if (!geom) return []
  if (geom.type === 'Polygon') {
    const r = ringToLatLng(geom.coordinates?.[0])
    return r.length ? [r] : []
  }
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates ?? [])
      .map((poly: any) => ringToLatLng(poly?.[0]))
      .filter((r: LatLng[]) => r.length)
  }
  return []
}

// Plain vertex mean — a good-enough flag anchor when a feature has no `center`.
function ringMean(pts: LatLng[]): LatLng | null {
  if (!pts.length) return null
  return {
    latitude:  pts.reduce((s, p) => s + p.latitude, 0) / pts.length,
    longitude: pts.reduce((s, p) => s + p.longitude, 0) / pts.length,
  }
}

export interface OglFeatures {
  greens: LatLng[]       // green centroids — one flag drawn per entry
  bunkers: LatLng[][]    // sand hazard outlines
  water: LatLng[][]      // water hazard outlines
}

// GET /features?course=<uuid> → typed surfaces. Returns null on any failure so
// the caller falls back to the Overpass result unchanged.
export async function getOpenGolfFeatures(id: string): Promise<OglFeatures | null> {
  const data = await fetchJson(`${OPENGOLF_FEATURES}?course=${encodeURIComponent(id)}`)
  const feats = Array.isArray(data?.features) ? data.features : null
  if (!feats) return null

  const greens: LatLng[] = []
  const bunkers: LatLng[][] = []
  const water: LatLng[][] = []
  for (const f of feats) {
    const type = f?.feature_type
    if (type === 'green') {
      const c = f?.center
      const lat = Number(c?.lat), lng = Number(c?.lng)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        greens.push({ latitude: lat, longitude: lng })
      } else {
        const ct = ringMean(outerRings(f?.geometry)[0] ?? [])
        if (ct) greens.push(ct)
      }
    } else if (type === 'bunker') {
      for (const r of outerRings(f?.geometry)) if (r.length >= 3) bunkers.push(r)
    } else if (type === 'water_hazard' || type === 'lateral_water_hazard' || type === 'creek') {
      for (const r of outerRings(f?.geometry)) if (r.length >= 3) water.push(r)
    }
  }
  return { greens, bunkers, water }
}

// OpenGolfAPI search → the same PascalCase shape golfcourseapi results use, so
// the app reads both identically. Latitude/Longitude come populated here.
export async function searchOpenGolf(query: string) {
  if (!query.trim()) return []
  const data = await fetchJson(`${OPENGOLF_BASE}/courses/search?q=${encodeURIComponent(query)}`)
  const list = Array.isArray(data) ? data : (data?.courses ?? [])
  return list.map((c: any) => ({
    CourseID:   OGL_PREFIX + c.id,
    ClubName:   c.name        ?? c.course_name ?? '',
    CourseName: c.course_name ?? c.name        ?? '',
    City:       c.city        ?? '',
    StateCode:  c.state       ?? '',
    Country:    c.country     ?? '',
    Latitude:   c.latitude  ?? null,
    Longitude:  c.longitude ?? null,
    hasGPS:     (c.latitude != null && c.longitude != null) ? 1 : 0,
    numHoles:   c.holes ?? 18,
  }))
}

// Raw single-course record (used by the GPS route for its lat/lng anchor).
export async function getOpenGolfCourseRaw(id: string): Promise<any | null> {
  return fetchJson(`${OPENGOLF_BASE}/courses/${encodeURIComponent(id)}`)
}

// OpenGolfAPI course → the app's CourseDetail shape. When the per-hole detail
// (from /courses/{id}/holes) is supplied it carries par, handicap and per-tee
// yardages, so we build a full scorecard + tee selector. Without it we fall back
// to the base course's par-only scorecard.
export function normOpenGolfDetail(c: any, holesData?: any[] | null, teesData?: any[] | null) {
  const rich = Array.isArray(holesData) && holesData.length > 0

  // Course rating + slope per tee, split by gender, keyed by color.
  const teeMeta: Record<string, { crM?: number; slM?: number; crF?: number; slF?: number }> = {}
  for (const t of teesData ?? []) {
    const color = String(t.tee_color ?? t.tee_name ?? '').toLowerCase()
    if (!color) continue
    const m = (teeMeta[color] ??= {})
    if (String(t.gender).toLowerCase() === 'female') { m.crF = t.course_rating ?? undefined; m.slF = t.slope ?? undefined }
    else                                             { m.crM = t.course_rating ?? undefined; m.slM = t.slope ?? undefined }
  }
  const source = rich
    ? holesData!
    : (Array.isArray(c.scorecard) ? c.scorecard : [])

  const holeNo = (h: any) => h.number ?? h.hole
  const yardsOf = (h: any, color: string) => {
    const v = h.yardages?.[color]
    return v != null && Number(v) > 0 ? Number(v) : null
  }

  // Collect every tee color that appears in the yardages, ordered back → forward
  // by total length so the tee selector reads longest-first.
  const teeColors: string[] = []
  if (rich) {
    const totals: Record<string, number> = {}
    for (const h of source) {
      for (const color of Object.keys(h.yardages ?? {})) {
        totals[color] = (totals[color] ?? 0) + (yardsOf(h, color) ?? 0)
      }
    }
    teeColors.push(...Object.keys(totals).sort((a, b) => totals[b] - totals[a]))
  }

  // A representative yardage per hole for the hole-level Yardage field (white,
  // else the longest tee) — a fallback the scorecard uses when no tee is picked.
  const mainColor = teeColors.includes('white') ? 'white' : teeColors[0]

  const Holes = source.map((h: any) => ({
    HoleNo:         holeNo(h),
    Par:            h.par ?? null,
    ParFemale:      null,
    Yardage:        mainColor ? yardsOf(h, mainColor) : null,
    Handicap:       h.handicap_index ?? h.handicap ?? null,
    HandicapFemale: null,
    TeeLatitude: null, TeeLongitude: null,
    GreenLatitude: null, GreenLongitude: null,
    GreenFrontLatitude: null, GreenFrontLongitude: null,
    GreenBackLatitude: null, GreenBackLongitude: null,
    Marker100: null, Marker150: null, Marker200: null,
    Waypoints: [], LayupSpots: [],
  }))

  // Build a Tee per color, with length1..N per hole (what the app scorecard reads).
  const Tees = teeColors.map((color, i) => {
    const meta = teeMeta[color.toLowerCase()] ?? {}
    const tee: any = {
      teeID:    `ogl-${color}-${i}`,
      teeName:  cap(color),
      teeColor: OGL_TEE_HEX[color.toLowerCase()] ?? null,
      courseRatingMen:   meta.crM ?? null,
      slopeMen:          meta.slM ?? null,
      courseRatingWomen: meta.crF ?? null,
      slopeWomen:        meta.slF ?? null,
    }
    for (const h of source) {
      const n = holeNo(h)
      if (n != null) tee[`length${n}`] = yardsOf(h, color)
    }
    return tee
  })

  // Header rating/slope: the longest tee's men's figures (fall back to women's).
  const headTee = teeColors.length ? (teeMeta[teeColors[0].toLowerCase()] ?? {}) : {}
  const headRating = headTee.crM ?? headTee.crF ?? null
  const headSlope  = headTee.slM ?? headTee.slF ?? null

  const totalPar = c.par ?? (Holes.reduce((a: number, h: any) => a + (h.Par ?? 0), 0) || null)
  return {
    CourseID:   OGL_PREFIX + c.id,
    ClubName:   c.name        ?? '',
    CourseName: c.course_name ?? c.name ?? '',
    Address:    c.address ?? null,
    City:       c.city ?? '',
    StateCode:  c.state ?? '',
    Zip:        c.postal_code ?? null,
    Country:    c.country ?? '',
    Latitude:   c.latitude ?? null,
    Longitude:  c.longitude ?? null,
    Par:        totalPar || null,
    Rating:     headRating,
    Slope:      headSlope,
    hasGPS:     (c.latitude != null && c.longitude != null) ? 1 : 0,
    CourseType: c.type ?? null,
    NumHoles:   c.holes ?? Holes.length ?? null,
    Architect:  null,
    YearBuilt:  c.year_built ?? null,
    PriceRange: null,
    Holes,
    holes:      Holes,
    Tees,
    polygons:   [],
    website:    c.website ?? null,
    telephone:  c.phone ?? null,
    Telephone:  c.phone ?? null,
  }
}
