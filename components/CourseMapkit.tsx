'use client'
import { useEffect, useRef, useCallback } from 'react'

export interface TeeData {
  name: string
  color?: string
  yardages: (number | null)[]
}

interface GolfHole {
  HoleNo?: number
  Number?: number
  Par?: number
  TeeLatitude?: string | number | null
  TeeLongitude?: string | number | null
  GreenLatitude?: string | number | null
  GreenLongitude?: string | number | null
}

interface Props {
  lat: number
  lng: number
  holes: GolfHole[]
  courseName: string
  selectedHole?: number
  onHoleClick?: (n: number) => void
  tees?: TeeData[]
}

declare global {
  interface Window { mapkit: any }
}

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

export default function CourseMapkit({
  lat, lng, holes, selectedHole, onHoleClick,
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<any>(null)
  const annotationsRef = useRef<any[]>([])
  const overlaysRef    = useRef<any[]>([])

  const buildMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map || !window.mapkit) return
    const mk = window.mapkit

    if (annotationsRef.current.length) map.removeAnnotations(annotationsRef.current)
    if (overlaysRef.current.length)    map.removeOverlays(overlaysRef.current)
    annotationsRef.current = []
    overlaysRef.current    = []

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
          { anchorOffset: new DOMPoint(0, 11), calloutEnabled: false, data: { n } }
        )
        annotationsRef.current.push(ann)
      }

      // Green marker — red flag
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
          { anchorOffset: new DOMPoint(0, 8), calloutEnabled: false, data: { n, green: true } }
        )
        annotationsRef.current.push(grn)
      }

      // Tee → green dashed line — only for selected hole
      if (active && tLat && tLng && gLat && gLng) {
        const line = new mk.PolylineOverlay(
          [new mk.Coordinate(tLat, tLng), new mk.Coordinate(gLat, gLng)],
        )
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

    // Pan to selected hole's tee position
    if (selectedHole != null) {
      const h = holes.find(h => holeNum(h) === selectedHole)
      if (h) {
        const tLat = parseCoord(h.TeeLatitude)
        const tLng = parseCoord(h.TeeLongitude)
        if (tLat && tLng) {
          map.setCenterAnimated(new mk.Coordinate(tLat, tLng))
        }
      }
    }
  }, [holes, selectedHole, onHoleClick])

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
        isRotationEnabled:   false,
      })

      map.setRegionAnimated(
        new mk.CoordinateRegion(
          new mk.Coordinate(lat, lng),
          new mk.CoordinateSpan(0.012, 0.012),
        ),
        false,
      )

      mapRef.current = map
      buildMarkers()
    })

    return () => {
      destroyed = true
      if (mapRef.current) {
        try { mapRef.current.destroy() } catch {}
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  // Update markers when selected hole changes
  useEffect(() => {
    if (mapRef.current) buildMarkers()
  }, [buildMarkers])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 400 }}
    />
  )
}
