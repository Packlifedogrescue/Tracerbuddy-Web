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

// POI type constants (must match API route)
const POI_FAIRWAY = 2
const POI_ROUGH   = 3
const POI_BUNKER  = 4
// 5 = water, 6 = OB — handled by default branch below

// Load MapKit JS once globally
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
    // Show rough/OB for all holes always; fairway/bunker/water only for selected hole
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
      const n    = holeNum(h)
      const tLat = parseCoord(h.TeeLatitude)
      const tLng = parseCoord(h.TeeLongitude)
      const gLat = parseCoord(h.GreenLatitude)
      const gLng = parseCoord(h.GreenLongitude)
      const active = selectedHole === n

      // Tee marker — numbered badge
      if (tLat && tLng) {
        const ann = new mk.Annotation(
          new mk.Coordinate(tLat, tLng),
          () => {
            const el = document.createElement('div')
            Object.assign(el.style, {
              width: '22px', height: '22px', borderRadius: '6px',
              background: active ? '#C9A84C' : '#111',
              color: 'white', fontSize: '10px', fontWeight: '900',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              border: `2px solid ${active ? '#fff' : 'rgba(255,255,255,0.5)'}`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              transform: active ? 'scale(1.25)' : 'scale(1)',
              transition: 'transform 0.15s',
            })
            el.textContent = String(n)
            el.addEventListener('click', e => { e.stopPropagation(); onHoleClick?.(n) })
            return el
          },
          { anchorOffset: new DOMPoint(0, 0), calloutEnabled: false, data: { n } }
        )
        annotationsRef.current.push(ann)
      }

      // Green marker — flag
      if (gLat && gLng) {
        const grn = new mk.Annotation(
          new mk.Coordinate(gLat, gLng),
          () => {
            const el = document.createElement('div')
            el.style.cssText = 'font-size:16px;line-height:1;cursor:pointer;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));'
            el.textContent = '🚩'
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
                fontSize: '9px',
                fontWeight: '800',
                padding: '2px 5px',
                borderRadius: '5px',
                border: '1.5px solid rgba(255,214,10,0.5)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              })
              el.textContent = spot.yards ? `${spot.yards}y` : '◆'
              return el
            },
            { anchorOffset: new DOMPoint(0, 0), calloutEnabled: false }
          )
          annotationsRef.current.push(layupAnn)
        }
      }

      // Tee → green dashed line, routing through dogleg waypoints when available
      if (active && tLat && tLng && gLat && gLng) {
        const waypoints = (h.Waypoints ?? []).map(w => new mk.Coordinate(w.lat, w.lng))
        const linePoints = [
          new mk.Coordinate(tLat, tLng),
          ...waypoints,
          new mk.Coordinate(gLat, gLng),
        ]
        const line = new mk.PolylineOverlay(linePoints)
        line.style = new mk.Style({
          lineWidth:   2.5,
          strokeColor: '#C9A84C',
          lineOpacity: 0.95,
          lineDash:    [8, 5],
        })
        overlaysRef.current.push(line)
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
          const cLat = (tLat + gLat) / 2
          const cLng = (tLng + gLng) / 2
          const span = Math.min(Math.max(Math.abs(gLat - tLat) * 2.0, Math.abs(gLng - tLng) * 2.0, 0.002), 0.008)
          map.setRegionAnimated(new mk.CoordinateRegion(
            new mk.Coordinate(cLat, cLng),
            new mk.CoordinateSpan(span, span),
          ))
          const lat1r = tLat * Math.PI / 180
          const lat2r = gLat * Math.PI / 180
          const dLngR = (gLng - tLng) * Math.PI / 180
          const y = Math.sin(dLngR) * Math.cos(lat2r)
          const x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLngR)
          map.setRotationAnimated(Math.atan2(y, x) * 180 / Math.PI)
        } else if (tLat && tLng) {
          map.setCenterAnimated(new mk.Coordinate(tLat, tLng))
        }
      }
    } else if (centeredRef.current) {
      // Deselected — zoom back to full course bounding box, reset north
      const coords: number[][] = []
      for (const h of holes) {
        const tLat = parseCoord(h.TeeLatitude),  tLng = parseCoord(h.TeeLongitude)
        const gLat = parseCoord(h.GreenLatitude), gLng = parseCoord(h.GreenLongitude)
        if (tLat && tLng) coords.push([tLat, tLng])
        if (gLat && gLng) coords.push([gLat, gLng])
      }
      if (coords.length > 0) {
        const lats = coords.map(c => c[0])
        const lngs = coords.map(c => c[1])
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
        const cLat = (minLat + maxLat) / 2, cLng = (minLng + maxLng) / 2
        const span = Math.max((maxLat - minLat) * 1.3, (maxLng - minLng) * 1.3, 0.004)
        map.setRegionAnimated(new mk.CoordinateRegion(
          new mk.Coordinate(cLat, cLng),
          new mk.CoordinateSpan(span, span),
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
        showsZoomControl:    true,
        showsMapTypeControl: false,
        isRotationEnabled:   true,
      })

      const coords: number[][] = []
      for (const h of holes) {
        const tLat = parseCoord(h.TeeLatitude),  tLng = parseCoord(h.TeeLongitude)
        const gLat = parseCoord(h.GreenLatitude), gLng = parseCoord(h.GreenLongitude)
        if (tLat && tLng) coords.push([tLat, tLng])
        if (gLat && gLng) coords.push([gLat, gLng])
      }

      let cLat = lat, cLng = lng, span = 0.004
      if (coords.length > 0) {
        const lats = coords.map(c => c[0])
        const lngs = coords.map(c => c[1])
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
        cLat = (minLat + maxLat) / 2
        cLng = (minLng + maxLng) / 2
        span = Math.max((maxLat - minLat) * 1.3, (maxLng - minLng) * 1.3, 0.004)
      }

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

  // Re-center to hole GPS bounding box once data arrives
  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.mapkit || centeredRef.current) return

    const coords: number[][] = []
    for (const h of holes) {
      const tLat = parseCoord(h.TeeLatitude),  tLng = parseCoord(h.TeeLongitude)
      const gLat = parseCoord(h.GreenLatitude), gLng = parseCoord(h.GreenLongitude)
      if (tLat && tLng) coords.push([tLat, tLng])
      if (gLat && gLng) coords.push([gLat, gLng])
    }
    if (coords.length === 0) return

    centeredRef.current = true
    const lats = coords.map(c => c[0])
    const lngs = coords.map(c => c[1])
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const cLat = (minLat + maxLat) / 2
    const cLng = (minLng + maxLng) / 2
    const span = Math.max((maxLat - minLat) * 1.3, (maxLng - minLng) * 1.3, 0.004)
    const mk = window.mapkit
    map.setRegionAnimated(new mk.CoordinateRegion(
      new mk.Coordinate(cLat, cLng),
      new mk.CoordinateSpan(span, span),
    ))
  }, [holes])

  // Update markers whenever selection or polygon data changes
  useEffect(() => {
    if (mapRef.current) buildMarkers()
  }, [buildMarkers])

  return (
    <div className="w-full h-full relative" style={{ minHeight: 400 }}>
      <div ref={containerRef} className="absolute inset-0" />
      <button
        onClick={() => { if (mapRef.current) mapRef.current.setRotationAnimated(0) }}
        title="Reset to north"
        className="absolute top-3 left-3 z-10 w-8 h-8 bg-black/70 backdrop-blur rounded-lg shadow-lg flex items-center justify-center text-base hover:bg-black/90 transition-colors"
      >
        🧭
      </button>
    </div>
  )
}
