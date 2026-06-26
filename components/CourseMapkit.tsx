'use client'
import { useEffect, useRef, useCallback } from 'react'

export interface TeeData {
  name: string
  color?: string
  yardages: (number | null)[]
}

export interface CoursePolygon {
  hole:   number
  poi:    number
  group:  number
  points: { lat: number; lng: number }[]
}

interface GolfHole {
  HoleNo?: number
  Number?: number
  Par?: number
  Yardage?: number
  Yards?: number
  TeeLatitude?: string | number | null
  TeeLongitude?: string | number | null
  GreenLatitude?: string | number | null
  GreenLongitude?: string | number | null
  Waypoints?: { lat: number; lng: number }[]
  LayupSpots?: { lat: number; lng: number; yards: number | null }[]
}

interface Props {
  lat: number
  lng: number
  holes: GolfHole[]
  courseName: string
  selectedHole?: number
  onHoleClick?: (n: number) => void
  tees?: TeeData[]
  polygons?: CoursePolygon[]
}

declare global {
  interface Window { mapkit: any }
}

const POI_FAIRWAY = 2
const POI_ROUGH   = 3
const POI_BUNKER  = 4

let mkState: 'idle' | 'loading' | 'ready' = 'idle'
const mkQueue: Array<() => void> = []

function loadMapKit(onReady: () => void) {
  if (mkState === 'ready') { onReady(); return }
  mkQueue.push(onReady)
  if (mkState !== 'idle') return
  mkState = 'loading'
  const script = document.createElement('script')
  script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js'
  script.crossOrigin = 'anonymous'
  script.onload = () => {
    fetch('/api/maps/token')
      .then(r => r.json())
      .then(({ token }) => {
        window.mapkit.init({
          authorizationCallback: (done: (t: string) => void) => done(token),
          language: 'en',
        })
        mkState = 'ready'
        mkQueue.forEach(fn => fn())
        mkQueue.length = 0
      })
  }
  document.head.appendChild(script)
}

function holeNum(h: GolfHole) { return h.HoleNo ?? h.Number ?? 0 }
function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(String(v))
  return isNaN(n) || n === 0 ? null : n
}

function polyStyle(mk: any, poi: number) {
  const isFairway = poi === POI_FAIRWAY
  const isRough   = poi === POI_ROUGH
  const isBunker  = poi === POI_BUNKER
  const isWater   = poi === 5
  const isOB      = poi === 6

  if (isOB) {
    return new mk.Style({
      fillColor: '#EF4444', fillOpacity: 0.08,
      strokeColor: '#DC2626', lineWidth: 2, strokeOpacity: 0.80,
      lineDash: [6, 4],
    })
  }
  return new mk.Style({
    fillColor:    isFairway ? '#22A06B' : isRough ? '#2D8C50' : isBunker ? '#D4B483' : isWater ? '#3B82F6' : '#999',
    fillOpacity:  isFairway ? 0.28 : isRough ? 0.12 : isBunker ? 0.28 : isWater ? 0.28 : 0.20,
    strokeColor:  isFairway ? '#1A8A55' : isRough ? '#1A6E35' : isBunker ? '#B8924E' : isWater ? '#2563EB' : '#666',
    lineWidth:    1,
    strokeOpacity: isFairway ? 0.50 : isRough ? 0.35 : 0.50,
  })
}

function courseBounds(holes: GolfHole[]) {
  const coords: number[][] = []
  for (const h of holes) {
    const tLat = parseCoord(h.TeeLatitude),  tLng = parseCoord(h.TeeLongitude)
    const gLat = parseCoord(h.GreenLatitude), gLng = parseCoord(h.GreenLongitude)
    if (tLat && tLng) coords.push([tLat, tLng])
    if (gLat && gLng) coords.push([gLat, gLng])
  }
  if (coords.length === 0) return null
  const lats = coords.map(c => c[0])
  const lngs = coords.map(c => c[1])
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const cLat = (minLat + maxLat) / 2
  const cLng = (minLng + maxLng) / 2
  // Use generous padding so the full course fits with room on all sides
  const span = Math.max((maxLat - minLat) * 1.8, (maxLng - minLng) * 1.8, 0.015)
  return { cLat, cLng, span }
}

export default function CourseMapkit({
  lat, lng, holes, selectedHole, onHoleClick, polygons,
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<any>(null)
  const annotationsRef = useRef<any[]>([])
  const overlaysRef    = useRef<any[]>([])
  const centeredRef    = useRef(false)

  const buildMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map || !window.mapkit) return
    const mk = window.mapkit

    if (annotationsRef.current.length) map.removeAnnotations(annotationsRef.current)
    if (overlaysRef.current.length)    map.removeOverlays(overlaysRef.current)
    annotationsRef.current = []
    overlaysRef.current    = []

    // ── Polygon overlays ─────────────────────────────────────────────────
    for (const poly of polygons ?? []) {
      const isDetailPoly = poly.poi === POI_FAIRWAY || poly.poi === POI_BUNKER || poly.poi === 5
      if (isDetailPoly && selectedHole !== undefined && poly.hole !== selectedHole) continue
      if (poly.points.length < 3) continue
      const coords  = poly.points.map(p => new mk.Coordinate(p.lat, p.lng))
      const overlay = new mk.PolygonOverlay(coords)
      overlay.style = polyStyle(mk, poly.poi)
      overlaysRef.current.push(overlay)
    }

    // ── Hole markers ─────────────────────────────────────────────────────
    for (const h of holes) {
      const n      = holeNum(h)
      const tLat   = parseCoord(h.TeeLatitude)
      const tLng   = parseCoord(h.TeeLongitude)
      const gLat   = parseCoord(h.GreenLatitude)
      const gLng   = parseCoord(h.GreenLongitude)
      const active = selectedHole === n

      // Tee marker — numbered badge
      if (tLat && tLng) {
        const ann = new mk.Annotation(
          new mk.Coordinate(tLat, tLng),
          () => {
            const el = document.createElement('div')
            Object.assign(el.style, {
              width: '28px', height: '28px', borderRadius: '8px',
              background: active ? '#C9A84C' : 'rgba(10,10,10,0.88)',
              color: active ? '#111' : 'white',
              fontSize: '12px', fontWeight: '900',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              border: `2px solid ${active ? '#fff' : 'rgba(255,255,255,0.3)'}`,
              boxShadow: `0 3px 10px rgba(0,0,0,${active ? '0.3' : '0.7'})`,
              transform: active ? 'scale(1.3)' : 'scale(1)',
              transition: 'transform 0.2s, background 0.2s',
            })
            el.textContent = String(n)
            el.addEventListener('click', e => { e.stopPropagation(); onHoleClick?.(n) })
            return el
          },
          { anchorOffset: new DOMPoint(0, 0), calloutEnabled: false, data: { n } }
        )
        annotationsRef.current.push(ann)
      }

      // Green marker — flag pin SVG
      if (gLat && gLng) {
        const grn = new mk.Annotation(
          new mk.Coordinate(gLat, gLng),
          () => {
            const el = document.createElement('div')
            el.style.cssText = 'cursor:pointer;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.75));'
            el.innerHTML = '<svg width="16" height="26" viewBox="0 0 16 26" fill="none"><line x1="3" y1="1" x2="3" y2="24" stroke="white" stroke-width="2" stroke-linecap="round"/><polygon points="3,2 15,7 3,12" fill="#C9A84C"/><circle cx="3" cy="25" r="2.5" fill="white" fill-opacity="0.9"/></svg>'
            el.addEventListener('click', e => { e.stopPropagation(); onHoleClick?.(n) })
            return el
          },
          { anchorOffset: new DOMPoint(0, 0), calloutEnabled: false, data: { n, green: true } }
        )
        annotationsRef.current.push(grn)
      }

      // Layup spot markers (selected hole only)
      if (active) {
        for (const spot of h.LayupSpots ?? []) {
          const layupAnn = new mk.Annotation(
            new mk.Coordinate(spot.lat, spot.lng),
            () => {
              const el = document.createElement('div')
              Object.assign(el.style, {
                background: '#1C1C1E',
                color: '#FFD60A',
                fontSize: '9px', fontWeight: '800',
                padding: '2px 5px', borderRadius: '5px',
                border: '1.5px solid rgba(255,214,10,0.5)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap', letterSpacing: '0.02em',
              })
              el.textContent = spot.yards ? `${spot.yards}y` : '◆'
              return el
            },
            { anchorOffset: new DOMPoint(0, 0), calloutEnabled: false }
          )
          annotationsRef.current.push(layupAnn)
        }
      }

      // Tee → green dashed line (active hole only)
      if (active && tLat && tLng && gLat && gLng) {
        const waypoints = (h.Waypoints ?? []).map(w => new mk.Coordinate(w.lat, w.lng))
        const linePoints = [
          new mk.Coordinate(tLat, tLng),
          ...waypoints,
          new mk.Coordinate(gLat, gLng),
        ]
        const line = new mk.PolylineOverlay(linePoints)
        line.style = new mk.Style({
          lineWidth: 2.5, strokeColor: '#C9A84C',
          lineOpacity: 0.95, lineDash: [8, 5],
        })
        overlaysRef.current.push(line)

        // Yardage + par label at midpoint
        const yds = h.Yardage ?? h.Yards
        const par = h.Par
        if (yds || par) {
          const wpts    = h.Waypoints ?? []
          const midIdx  = Math.floor(wpts.length / 2)
          const midLat  = wpts.length > 0 ? wpts[midIdx].lat : (tLat + gLat) / 2
          const midLng  = wpts.length > 0 ? wpts[midIdx].lng : (tLng + gLng) / 2
          const ydsAnn  = new mk.Annotation(
            new mk.Coordinate(midLat, midLng),
            () => {
              const el = document.createElement('div')
              Object.assign(el.style, {
                background: 'rgba(0,0,0,0.82)',
                color: '#C9A84C', fontSize: '10px', fontWeight: '900',
                padding: '3px 8px', borderRadius: '6px',
                whiteSpace: 'nowrap', letterSpacing: '0.02em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
              })
              const parts: string[] = []
              if (yds) parts.push(`${yds}y`)
              if (par) parts.push(`Par ${par}`)
              el.textContent = parts.join(' · ')
              return el
            },
            { anchorOffset: new DOMPoint(0, 0), calloutEnabled: false }
          )
          annotationsRef.current.push(ydsAnn)
        }
      }
    }

    if (annotationsRef.current.length) map.addAnnotations(annotationsRef.current)
    if (overlaysRef.current.length)    map.addOverlays(overlaysRef.current)

    // ── Pan/zoom to selected hole ─────────────────────────────────────────
    if (selectedHole != null) {
      const h = holes.find(h => holeNum(h) === selectedHole)
      if (h) {
        const tLat = parseCoord(h.TeeLatitude)
        const tLng = parseCoord(h.TeeLongitude)
        const gLat = parseCoord(h.GreenLatitude)
        const gLng = parseCoord(h.GreenLongitude)

        if (tLat && tLng && gLat && gLng) {
          // Haversine distance in metres
          const lat1r  = tLat * Math.PI / 180
          const lat2r  = gLat * Math.PI / 180
          const dLngR  = (gLng - tLng) * Math.PI / 180
          const dLat   = (gLat - tLat) * Math.PI / 180
          const a      = Math.sin(dLat / 2) ** 2 + Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dLngR / 2) ** 2
          const distM  = 2 * 6371000 * Math.asin(Math.sqrt(a))

          const cLat     = (tLat + gLat) / 2
          const cLng     = (tLng + gLng) / 2
          const altitude = Math.max(120, distM * 0.7)

          // Try pitched camera — north-up (heading 0) to avoid map spinning
          if (typeof mk.MapCamera === 'function') {
            map.setCameraAnimated(
              new mk.MapCamera(new mk.Coordinate(cLat, cLng), altitude, 0, 55)
            )
          } else {
            // Flat 2D fallback — tight zoom, no rotation
            const span = Math.min(
              Math.max(Math.abs(gLat - tLat) * 2.5, Math.abs(gLng - tLng) * 2.5, 0.002),
              0.010,
            )
            map.setRegionAnimated(new mk.CoordinateRegion(
              new mk.Coordinate(cLat, cLng),
              new mk.CoordinateSpan(span, span),
            ))
          }
        } else if (tLat && tLng) {
          map.setCenterAnimated(new mk.Coordinate(tLat, tLng))
        }
      }
    } else if (centeredRef.current) {
      // Deselected — zoom back to full top-down course overview
      const bounds = courseBounds(holes)
      if (bounds) {
        map.setRegionAnimated(new mk.CoordinateRegion(
          new mk.Coordinate(bounds.cLat, bounds.cLng),
          new mk.CoordinateSpan(bounds.span, bounds.span),
        ))
        map.setRotationAnimated(0)
      }
    }
  }, [holes, selectedHole, onHoleClick, polygons])

  // Init map
  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false

    loadMapKit(() => {
      if (destroyed || !containerRef.current) return
      const mk = window.mapkit

      const map = new mk.Map(containerRef.current, {
        mapType:             mk.Map.MapTypes.Satellite,
        showsCompass:        mk.FeatureVisibility.Hidden,
        showsZoomControl:    false,
        showsMapTypeControl: false,
        isRotationEnabled:   true,
      })

      // Initial region — fit whole course
      const bounds = courseBounds(holes)
      const cLat   = bounds?.cLat ?? lat
      const cLng   = bounds?.cLng ?? lng
      const span   = bounds?.span ?? 0.015

      map.setRegionAnimated(
        new mk.CoordinateRegion(
          new mk.Coordinate(cLat, cLng),
          new mk.CoordinateSpan(span, span),
        ),
        false,
      )

      mapRef.current = map
      buildMarkers()
    })

    return () => {
      destroyed = true
      centeredRef.current = false
      if (mapRef.current) {
        try { mapRef.current.destroy() } catch {}
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  // Re-center to course bounding box once hole data arrives
  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.mapkit || centeredRef.current) return
    const bounds = courseBounds(holes)
    if (!bounds) return
    centeredRef.current = true
    map.setRegionAnimated(new window.mapkit.CoordinateRegion(
      new window.mapkit.Coordinate(bounds.cLat, bounds.cLng),
      new window.mapkit.CoordinateSpan(bounds.span, bounds.span),
    ))
  }, [holes])

  // Update markers whenever selection or polygon data changes
  useEffect(() => {
    if (mapRef.current) buildMarkers()
  }, [buildMarkers])

  return (
    <div className="w-full h-full relative" style={{ minHeight: 400 }}>
      <div ref={containerRef} className="absolute inset-0" />
      {/* North reset button */}
      <button
        onClick={() => { if (mapRef.current) mapRef.current.setRotationAnimated(0) }}
        title="Reset north"
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-xl shadow-lg flex items-center justify-center transition-colors"
        style={{ background: 'rgba(10,10,10,0.82)', backdropFilter: 'blur(6px)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <polygon points="9,2 12,10 9,8.5 6,10" fill="#C9A84C"/>
          <polygon points="9,16 6,8 9,9.5 12,8" fill="rgba(255,255,255,0.35)"/>
          <text x="9" y="5.5" textAnchor="middle" fill="white" fontSize="3.5" fontWeight="bold" fontFamily="system-ui">N</text>
        </svg>
      </button>
    </div>
  )
}
