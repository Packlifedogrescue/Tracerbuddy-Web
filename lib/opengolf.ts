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
export function normOpenGolfDetail(c: any, holesData?: any[] | null) {
  const rich = Array.isArray(holesData) && holesData.length > 0
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
    const tee: any = {
      teeID:    `ogl-${color}-${i}`,
      teeName:  cap(color),
      teeColor: OGL_TEE_HEX[color.toLowerCase()] ?? null,
    }
    for (const h of source) {
      const n = holeNo(h)
      if (n != null) tee[`length${n}`] = yardsOf(h, color)
    }
    return tee
  })

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
    Tees,
    polygons:   [],
    website:    c.website ?? null,
    telephone:  c.phone ?? null,
    Telephone:  c.phone ?? null,
  }
}
