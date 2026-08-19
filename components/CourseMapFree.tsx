'use client'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Free satellite course map. Tiles come from Esri World Imagery (no API key, free
// for reasonable use) and the green/tee/hole geometry comes from our own
// /api/golf/raw-coordinates endpoint (OpenStreetMap). No Mapbox / Apple key, so
// this stays $0/month. Rendered imperatively (not react-leaflet) so it's immune
// to React-version / SSR quirks; the page mounts it with ssr:false.

export interface GpsCoord { latitude: number; longitude: number }
export interface GpsHole {
  hole: number | null
  par: number | null
  tee: GpsCoord | null
  tees?: GpsCoord[]
  green: GpsCoord | null
  greenPolygon: GpsCoord[]
  pin: GpsCoord | null
}

// The flag: exact pin when OSM maps one, else the green centroid (its middle).
function flagPoint(h: GpsHole): GpsCoord | null { return h.pin ?? h.green }

function flagIcon() {
  return L.divIcon({
    className: '',
    html: `<svg width="12" height="16" viewBox="0 0 12 16" xmlns="http://www.w3.org/2000/svg">
      <line x1="1.5" y1="15" x2="1.5" y2="1" stroke="#F3EFE3" stroke-width="1.5"/>
      <path d="M1.5 1 L10 3.2 L1.5 5.6 Z" fill="#E5484D"/>
    </svg>`,
    iconSize: [12, 16],
    iconAnchor: [1.5, 15],
  })
}

// Great-circle distance in yards.
function distYards(a: GpsCoord, b: GpsCoord): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const la1 = toRad(a.latitude), la2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))) * 1.09361)
}

// Front / center / back of the green, measured from the hole's tee (there's no
// live player position on the web map). Front = nearest green edge, back =
// farthest, center = the centroid. Null when there's no tee to measure from.
function computeFCB(h: GpsHole): { front: number; center: number; back: number } | null {
  if (!h.tee) return null
  const flag = flagPoint(h)
  const poly = h.greenPolygon ?? []
  if (poly.length >= 3) {
    const ds = poly.map(p => distYards(h.tee!, p))
    const front = Math.min(...ds)
    const back  = Math.max(...ds)
    const center = flag ? distYards(h.tee, flag) : Math.round((front + back) / 2)
    return { front, center, back }
  }
  if (flag) { const c = distYards(h.tee, flag); return { front: c, center: c, back: c } }
  return null
}

function holeIcon(num: number, active: boolean) {
  const bg = active ? '#C9A84C' : 'rgba(17,17,17,0.82)'
  const bd = active ? '#ffffff' : 'rgba(201,168,76,0.7)'
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${bg};border:1.5px solid ${bd};color:#fff;font:800 11px/22px system-ui,sans-serif;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.45)">${num}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

interface HoleLayer {
  marker?: L.Marker
  poly?: L.Polygon
  line?: L.Polyline
  lines?: L.Polyline[]
  teeDots?: L.CircleMarker[]
  flag?: L.Marker
}

export default function CourseMapFree({
  center, holes, selectedHole, onHoleClick,
}: {
  center: GpsCoord
  holes: GpsHole[]
  selectedHole?: number
  onHoleClick?: (n: number) => void
}) {
  const elRef   = useRef<HTMLDivElement>(null)
  const mapRef  = useRef<L.Map | null>(null)
  const layers  = useRef<Record<number, HoleLayer>>({})
  const allBounds = useRef<L.LatLngBounds | null>(null)
  const clickRef = useRef(onHoleClick)
  clickRef.current = onHoleClick

  const selHole = selectedHole != null ? holes.find(h => h.hole === selectedHole) : undefined
  const fcb = selHole ? computeFCB(selHole) : null

  // Build the map once. The page gives this component a key={courseID}, so a new
  // course remounts it with fresh geometry rather than mutating in place.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true })
    mapRef.current = map
    L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Imagery &copy; Esri', maxZoom: 19 },
    ).addTo(map)

    const bounds: L.LatLngExpression[] = []

    for (const h of holes) {
      if (h.hole == null) continue
      const num = h.hole
      const layer: HoleLayer = {}

      if (h.greenPolygon && h.greenPolygon.length >= 3) {
        layer.poly = L.polygon(
          h.greenPolygon.map(p => [p.latitude, p.longitude] as [number, number]),
          { color: '#2FBE77', weight: 1.5, fillColor: '#2f7d52', fillOpacity: 0.5 },
        ).addTo(map)
      }

      // Play line(s): from each tee box to the flag (exact pin, else green center).
      const flag = flagPoint(h)
      const teeBoxes = (h.tees && h.tees.length ? h.tees : (h.tee ? [h.tee] : []))
      if (flag && teeBoxes.length) {
        const lines: L.Polyline[] = []
        for (const t of teeBoxes) {
          lines.push(L.polyline(
            [[t.latitude, t.longitude], [flag.latitude, flag.longitude]],
            { color: '#C9A84C', weight: 2, opacity: 0.45, dashArray: '4 6' },
          ).addTo(map))
          // Small marker at the tee box itself.
          layer.teeDots ??= []
          layer.teeDots.push(
            L.circleMarker([t.latitude, t.longitude],
              { radius: 3, color: '#20160a', weight: 1, fillColor: '#C9A84C', fillOpacity: 1 })
              .addTo(map),
          )
        }
        layer.line = lines[0]
        layer.lines = lines
      }

      // Flag marker at the pin / green center.
      if (flag) {
        layer.flag = L.marker([flag.latitude, flag.longitude], { icon: flagIcon(), interactive: false }).addTo(map)
      }

      // Numbered marker at the (back) tee.
      const anchor = h.tee ?? h.green
      if (anchor) {
        layer.marker = L.marker([anchor.latitude, anchor.longitude], { icon: holeIcon(num, false) })
          .addTo(map)
          .on('click', () => clickRef.current?.(num))
      }

      layers.current[num] = layer
      if (h.green) bounds.push([h.green.latitude, h.green.longitude])
      for (const t of teeBoxes) bounds.push([t.latitude, t.longitude])
      for (const p of h.greenPolygon ?? []) bounds.push([p.latitude, p.longitude])
    }

    if (bounds.length) {
      allBounds.current = L.latLngBounds(bounds).pad(0.12)
      map.fitBounds(allBounds.current)
    } else {
      map.setView([center.latitude, center.longitude], 15)
    }

    return () => { map.remove(); mapRef.current = null; layers.current = {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect the selected hole (highlight its green + marker).
  useEffect(() => {
    for (const [numStr, layer] of Object.entries(layers.current)) {
      const num = Number(numStr)
      const active = num === selectedHole
      layer.poly?.setStyle({
        color: active ? '#C9A84C' : '#2FBE77',
        weight: active ? 2.5 : 1.5,
        fillOpacity: active ? 0.75 : 0.5,
      })
      layer.marker?.setIcon(holeIcon(num, active))
      if (active) layer.marker?.setZIndexOffset(1000)
      else layer.marker?.setZIndexOffset(0)
      for (const ln of layer.lines ?? []) ln.setStyle({ opacity: active ? 0.95 : 0.45, weight: active ? 2.5 : 2 })
    }

    // Zoom to the selected hole (tee → green), or back to the whole course.
    const map = mapRef.current
    if (!map) return
    if (selHole) {
      const pts: L.LatLngExpression[] = []
      if (selHole.tee)   pts.push([selHole.tee.latitude, selHole.tee.longitude])
      if (selHole.green) pts.push([selHole.green.latitude, selHole.green.longitude])
      for (const p of selHole.greenPolygon ?? []) pts.push([p.latitude, p.longitude])
      if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.35), { maxZoom: 17, duration: 0.6 })
    } else if (allBounds.current) {
      map.flyToBounds(allBounds.current, { duration: 0.6 })
    }
  }, [selectedHole, selHole])

  return (
    <div className="relative w-full h-full">
      <div ref={elRef} className="w-full h-full" style={{ background: '#0b2114' }} />

      {/* Front / center / back badge for the selected hole */}
      {fcb && selHole && (
        <div className="absolute top-3 left-3 z-[1000] pointer-events-none select-none">
          <div className="rounded-2xl bg-[#0d0d0d]/92 backdrop-blur-sm border border-[#C9A84C]/30 shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-2">
              <div className="w-5 h-5 rounded-md bg-[#C9A84C] text-[#20160a] text-[10px] font-black flex items-center justify-center leading-none">
                {selHole.hole}
              </div>
              <span className="text-[11px] font-bold text-white/90 tracking-wide">
                Hole {selHole.hole}{selHole.par ? ` · Par ${selHole.par}` : ''}
              </span>
            </div>
            <div className="flex items-stretch">
              {([
                ['Front', fcb.front,  false],
                ['Center', fcb.center, true],
                ['Back', fcb.back,   false],
              ] as const).map(([lab, val, mid]) => (
                <div key={lab} className={`px-3.5 py-2 text-center ${mid ? 'bg-[#C9A84C]/10' : ''}`}>
                  <div className="text-[8.5px] font-bold uppercase tracking-[0.15em] text-white/45">{lab}</div>
                  <div className={`font-black tabular-nums leading-none mt-1 ${mid ? 'text-[26px] text-[#C9A84C]' : 'text-[19px] text-white/90'}`}>{val}</div>
                </div>
              ))}
            </div>
            <div className="text-[8.5px] text-white/40 text-center pb-1.5 tracking-wide">yards from the tee</div>
          </div>
        </div>
      )}
    </div>
  )
}
