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
  green: GpsCoord | null
  greenPolygon: GpsCoord[]
  pin: GpsCoord | null
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

interface HoleLayer { marker?: L.Marker; poly?: L.Polygon; line?: L.Polyline }

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
  const clickRef = useRef(onHoleClick)
  clickRef.current = onHoleClick

  // Build the map once. The page gives this component a key={courseID}, so a new
  // course remounts it with fresh geometry rather than mutating in place.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true })
    mapRef.current = map

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

      if (h.tee && h.green) {
        layer.line = L.polyline(
          [[h.tee.latitude, h.tee.longitude], [h.green.latitude, h.green.longitude]],
          { color: '#C9A84C', weight: 2, opacity: 0.5, dashArray: '4 6' },
        ).addTo(map)
      }

      const anchor = h.tee ?? h.green
      if (anchor) {
        layer.marker = L.marker([anchor.latitude, anchor.longitude], { icon: holeIcon(num, false) })
          .addTo(map)
          .on('click', () => clickRef.current?.(num))
      }

      layers.current[num] = layer
      if (h.green) bounds.push([h.green.latitude, h.green.longitude])
      if (h.tee)   bounds.push([h.tee.latitude, h.tee.longitude])
      for (const p of h.greenPolygon ?? []) bounds.push([p.latitude, p.longitude])
    }

    if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.12))
    else map.setView([center.latitude, center.longitude], 15)

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
    }
  }, [selectedHole])

  return <div ref={elRef} className="w-full h-full" style={{ background: '#0b2114' }} />
}
