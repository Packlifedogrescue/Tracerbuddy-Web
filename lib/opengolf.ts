// OpenGolfAPI (opengolfapi.org) — a free, no-key, structured API over
// OpenStreetMap golf data. We use it alongside golfcourseapi: it brings broad
// coverage + course GPS (lat/lng) and par-per-hole scorecards, while
// golfcourseapi brings the richer per-tee yardages/ratings. Data is © OpenStreetMap
// contributors (ODbL) — the map credits OSM accordingly.
//
// Its course IDs are UUIDs; we prefix them with "ogl_" so the golf routes can
// tell which provider a course came from and fetch detail/GPS from the right one.

const OPENGOLF_BASE = 'https://api.opengolfapi.org/v1'
export const OGL_PREFIX = 'ogl_'

export const isOgl = (id: string) => id.startsWith(OGL_PREFIX)
export const stripOgl = (id: string) => id.slice(OGL_PREFIX.length)

async function fetchJson(url: string, ms = 8000): Promise<any | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
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

// OpenGolfAPI course → the app's CourseDetail shape. Par-per-hole only (no
// yardages/tees without an OpenGolf ID), so those fields come back null and the
// scorecard shows par with blank yardages.
export function normOpenGolfDetail(c: any) {
  const scorecard = Array.isArray(c.scorecard) ? c.scorecard : []
  const Holes = scorecard.map((h: any) => ({
    HoleNo:         h.hole,
    Par:            h.par ?? null,
    ParFemale:      null,
    Yardage:        null,
    Handicap:       null,
    HandicapFemale: null,
    TeeLatitude: null, TeeLongitude: null,
    GreenLatitude: null, GreenLongitude: null,
    GreenFrontLatitude: null, GreenFrontLongitude: null,
    GreenBackLatitude: null, GreenBackLongitude: null,
    Marker100: null, Marker150: null, Marker200: null,
    Waypoints: [], LayupSpots: [],
  }))
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
    Rating:     null,
    Slope:      null,
    hasGPS:     (c.latitude != null && c.longitude != null) ? 1 : 0,
    CourseType: c.type ?? null,
    NumHoles:   c.holes ?? Holes.length ?? null,
    Architect:  null,
    YearBuilt:  c.year_built ?? null,
    PriceRange: null,
    Holes,
    holes:      Holes,
    Tees:       [],
    polygons:   [],
    website:    c.website ?? null,
    telephone:  c.phone ?? null,
    Telephone:  c.phone ?? null,
  }
}
