'use client'
import { useEffect, useRef, useState } from 'react'
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

// The flag sits at the green's center (the polygon centroid — always on the
// green). OSM "pin" nodes exist but are sparse and often misplaced off the
// green, so we only fall back to one when there's no green geometry at all.
function flagPoint(h: GpsHole): GpsCoord | null { return h.green ?? h.pin }

// OSM doesn't record tee color, but tee boxes are ordered back → forward, and
// courses almost always run their colors that way (championship/back darkest,
// forward reddest). So we approximate the scorecard colors from that order.
// This is a sensible guess, not ground truth — a course with an unusual color
// scheme will differ.
const TEE_RAMPS: Record<number, string[]> = {
  1: ['#3B82F6'],
  2: ['#3B82F6', '#EF4444'],
  3: ['#3B82F6', '#E5E7EB', '#EF4444'],
  4: ['#111111', '#3B82F6', '#E5E7EB', '#EF4444'],
  5: ['#111111', '#3B82F6', '#E5E7EB', '#D4AF37', '#EF4444'],
  6: ['#111111', '#3B82F6', '#E5E7EB', '#D4AF37', '#22A06B', '#EF4444'],
}
function teeColorRamp(n: number): string[] {
  if (n <= 0) return []
  if (TEE_RAMPS[n]) return TEE_RAMPS[n]
  const out = ['#111111', '#3B82F6', '#E5E7EB']   // n > 6: pad the middle with gold
  while (out.length < n - 1) out.push('#D4AF37')
  out.push('#EF4444')
  return out.slice(0, n)
}

// Compact flag: short pole so the banner sits right on the green rather than
// floating above it. Anchored at the pole base (the cup).
function flagIcon() {
  return L.divIcon({
    className: '',
    html: `<svg width="10" height="11" viewBox="0 0 10 11" xmlns="http://www.w3.org/2000/svg">
      <line x1="1" y1="10.5" x2="1" y2="1" stroke="#ffffff" stroke-width="1.3"/>
      <path d="M1 1 L7.5 2.6 L1 4.2 Z" fill="#E5484D"/>
    </svg>`,
    iconSize: [10, 11],
    iconAnchor: [1, 10],
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
  lineColors?: string[]
  teeDots?: L.CircleMarker[]
  flag?: L.Marker
  cup?: L.CircleMarker
}

function sameColor(a?: string, b?: string) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase()
}

export default function CourseMapFree({
  center, holes, bunkers, water, matchedCourse, teeColors, selectedTeeColor, selectedHole, onHoleClick,
  wind, holeElevations,
}: {
  center: GpsCoord
  holes: GpsHole[]
  bunkers?: GpsCoord[][]      // sand hazard outlines
  water?: GpsCoord[][]        // water hazard outlines
  matchedCourse?: string | null   // OSM course name this map locked onto
  teeColors?: string[]        // real scorecard tee colors, back → forward
  selectedTeeColor?: string   // the tee chosen in the scorecard panel
  selectedHole?: number
  onHoleClick?: (n: number) => void
  wind?: { speedMph: number; dirDeg: number } | null   // current wind at the course
  holeElevations?: Record<number, number>              // per hole: green−tee, in feet
}) {
  const elRef   = useRef<HTMLDivElement>(null)
  const mapRef  = useRef<L.Map | null>(null)
  const layers  = useRef<Record<number, HoleLayer>>({})
  const allBounds = useRef<L.LatLngBounds | null>(null)
  const clickRef = useRef(onHoleClick)
  clickRef.current = onHoleClick
  const teeColorRef = useRef(selectedTeeColor)
  teeColorRef.current = selectedTeeColor

  // Measure tool state
  const [measuring, setMeasuring] = useState(false)
  const [measureYds, setMeasureYds] = useState<number | null>(null)
  const measurePts = useRef<L.LatLng[]>([])
  const measureLayer = useRef<L.LayerGroup | null>(null)

  const selHole = selectedHole != null ? holes.find(h => h.hole === selectedHole) : undefined
  const fcb = selHole ? computeFCB(selHole) : null
  const hasOverlays = holes.some(h => h.hole != null && (h.green != null || (h.greenPolygon?.length ?? 0) > 0))

  // Build the map once. The page gives this component a key={courseID}, so a new
  // course remounts it with fresh geometry rather than mutating in place.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true })
    mapRef.current = map
    L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Imagery &copy; Esri · Golf data &copy; OpenStreetMap', maxZoom: 19 },
    ).addTo(map)

    // NB: we deliberately do NOT paint fills over water/bunkers — the satellite
    // already shows them far better than a flat color would.

    measureLayer.current = L.layerGroup().addTo(map)

    const bounds: L.LatLngExpression[] = []

    for (const h of holes) {
      if (h.hole == null) continue
      const num = h.hole
      const layer: HoleLayer = {}

      // The green outline is invisible by default (the satellite shows the green);
      // the selected-hole effect reveals a thin gold ring so you can see the
      // target green when a hole is focused. No fill over the imagery.
      if (h.greenPolygon && h.greenPolygon.length >= 3) {
        layer.poly = L.polygon(
          h.greenPolygon.map(p => [p.latitude, p.longitude] as [number, number]),
          { color: '#C9A84C', weight: 2, opacity: 0, fillOpacity: 0, interactive: false },
        ).addTo(map)
      }

      // Flag only where OSM actually mapped a green polygon, so it can never
      // float on bare ground (par-3 tees, mis-oriented holes, etc.).
      const flag = (h.greenPolygon && h.greenPolygon.length >= 3) ? flagPoint(h) : null
      const teeBoxes = (h.tees && h.tees.length ? h.tees : (h.tee ? [h.tee] : []))
      if (flag && teeBoxes.length) {
        // Real scorecard tee colors (back → forward) when we have them; fall
        // back to the order-based ramp only for tee boxes without a match.
        const ramp = teeColorRamp(teeBoxes.length)
        const colors = (teeColors && teeColors.length)
          ? teeBoxes.map((_, i) => teeColors[i] ?? ramp[i] ?? '#C9A84C')
          : ramp
        // Lines start hidden; the tee-selection effect reveals exactly ONE per
        // hole (the selected tee, else the back tee) so the map stays clean.
        const lines: L.Polyline[] = []
        const dots: L.CircleMarker[] = []
        teeBoxes.forEach((t, i) => {
          const col = colors[i] ?? '#C9A84C'
          lines.push(L.polyline(
            [[t.latitude, t.longitude], [flag.latitude, flag.longitude]],
            { color: col, weight: 3, opacity: 0, dashArray: '4 6' },
          ).addTo(map))
          dots.push(
            L.circleMarker([t.latitude, t.longitude],
              { radius: 3, color: '#0b0b0b', weight: 1.5, fillColor: col, opacity: 0, fillOpacity: 0 })
              .addTo(map),
          )
        })
        layer.line = lines[0]
        layer.lines = lines
        layer.lineColors = colors
        layer.teeDots = dots
      }

      // Flag at the green center: a cup dot (unmistakably on the green) with a
      // short flag rising from it.
      if (flag) {
        layer.cup = L.circleMarker([flag.latitude, flag.longitude],
          { radius: 2.5, color: '#0b0b0b', weight: 1, fillColor: '#ffffff', fillOpacity: 1, interactive: false })
          .addTo(map)
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

  // Reflect the selected hole: highlight its green + marker, and show its play
  // line + tee dots ONLY (the whole-course view stays clean — greens, flags,
  // numbers, hazards, no line web). The shown line is the selected tee's, else
  // the back tee.
  useEffect(() => {
    for (const [numStr, layer] of Object.entries(layers.current)) {
      const num = Number(numStr)
      const active = num === selectedHole
      layer.poly?.setStyle({ opacity: active ? 0.95 : 0, weight: 2, fillOpacity: 0 })
      layer.marker?.setIcon(holeIcon(num, active))
      layer.marker?.setZIndexOffset(active ? 1000 : 0)

      const lines = layer.lines ?? []
      const cols = layer.lineColors ?? []
      let showIdx = selectedTeeColor ? cols.findIndex(c => sameColor(c, selectedTeeColor)) : -1
      if (showIdx === -1) showIdx = 0
      lines.forEach((ln, i) => ln.setStyle({ opacity: active && i === showIdx ? 0.95 : 0 }))
      ;(layer.teeDots ?? []).forEach((dot, i) => {
        const on = !selectedTeeColor || sameColor(cols[i], selectedTeeColor)
        dot.setStyle({ opacity: active ? 1 : 0, fillOpacity: active ? (on ? 1 : 0.4) : 0, radius: on ? 4 : 3 })
      })
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
  }, [selectedHole, selHole, selectedTeeColor])

  // Measure tool: while active, each map tap drops a point; the running total
  // yardage of the chain is shown. Toggling off clears it.
  useEffect(() => {
    const map = mapRef.current
    const lg = measureLayer.current
    if (!map || !lg) return
    if (!measuring) {
      lg.clearLayers()
      measurePts.current = []
      setMeasureYds(null)
      map.getContainer().style.cursor = ''
      return
    }
    map.getContainer().style.cursor = 'crosshair'
    const redraw = () => {
      lg.clearLayers()
      const pts = measurePts.current
      pts.forEach(p => L.circleMarker(p, { radius: 4, color: '#fff', weight: 2, fillColor: '#C9A84C', fillOpacity: 1 }).addTo(lg))
      if (pts.length >= 2) {
        L.polyline(pts, { color: '#C9A84C', weight: 2.5, dashArray: '5 5' }).addTo(lg)
        let m = 0
        for (let i = 1; i < pts.length; i++) m += pts[i - 1].distanceTo(pts[i])
        setMeasureYds(Math.round(m * 1.09361))
      } else {
        setMeasureYds(null)
      }
    }
    const onClick = (e: L.LeafletMouseEvent) => { measurePts.current.push(e.latlng); redraw() }
    map.on('click', onClick)
    return () => { map.off('click', onClick); map.getContainer().style.cursor = '' }
  }, [measuring])

  return (
    <div className="relative w-full h-full">
      <div ref={elRef} className="w-full h-full" style={{ background: '#0b2114' }} />

      {/* Measure tool button + readout */}
      <div className="absolute top-3 right-16 z-[1000] flex items-center gap-2">
        {measuring && measureYds != null && (
          <div className="rounded-lg bg-[#0d0d0d]/90 text-[#C9A84C] text-[13px] font-black tabular-nums px-2.5 py-1 shadow">
            {measureYds} <span className="text-white/50 text-[10px] font-bold">yds</span>
          </div>
        )}
        {measuring && (
          <button onClick={() => { measurePts.current = []; measureLayer.current?.clearLayers(); setMeasureYds(null) }}
            className="rounded-lg bg-[#0d0d0d]/90 text-white/80 text-[11px] font-bold px-2.5 py-1.5 shadow hover:text-white">
            Clear
          </button>
        )}
        <button onClick={() => setMeasuring(m => !m)}
          className={`rounded-lg text-[11px] font-bold px-2.5 py-1.5 shadow transition-colors ${
            measuring ? 'bg-[#C9A84C] text-[#20160a]' : 'bg-[#0d0d0d]/90 text-white/80 hover:text-white'
          }`}>
          {measuring ? 'Done' : 'Measure'}
        </button>
      </div>

      {/* Which OSM course this map locked onto (glanceable confidence check). */}
      {matchedCourse && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[900] pointer-events-none select-none max-w-[70%]">
          <div className="rounded-full bg-[#0d0d0d]/80 backdrop-blur-sm text-white/80 text-[10.5px] font-semibold px-3 py-1 shadow truncate">
            ⛳ {matchedCourse}
          </div>
        </div>
      )}

      {/* Satellite-only courses: OSM has the location but no mapped holes/greens. */}
      {!hasOverlays && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="rounded-full bg-[#0d0d0d]/85 backdrop-blur-sm text-white/85 text-[11px] font-medium px-3.5 py-1.5 shadow-lg text-center">
            Satellite view · hole overlays not mapped for this course yet
          </div>
        </div>
      )}

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
            {selHole.hole != null && holeElevations?.[selHole.hole] != null && Math.abs(holeElevations[selHole.hole]) >= 3 && (() => {
              const ft = holeElevations![selHole.hole!]
              const up = ft > 0
              const playsLike = fcb.center + Math.round(ft / 3)   // ~1 yd per 3 ft, approximate
              return (
                <div className="border-t border-white/10 px-3.5 py-1.5 text-center">
                  <span className="text-[10px] font-bold text-white/80">
                    {up ? '↑' : '↓'} {Math.abs(ft)} ft {up ? 'uphill' : 'downhill'}
                  </span>
                  <span className="text-[10px] text-white/45"> · plays ~<span className="text-[#C9A84C] font-bold">{playsLike}</span></span>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Wind (current, at the course) */}
      {wind && (
        <div className="absolute bottom-8 left-3 z-[1000] pointer-events-none select-none">
          <div className="flex items-center gap-2 rounded-xl bg-[#0d0d0d]/90 backdrop-blur-sm border border-white/10 px-2.5 py-1.5 shadow-lg">
            <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: `rotate(${wind.dirDeg + 180}deg)` }}>
              <path d="M11 3 L15 15 L11 12 L7 15 Z" fill="#C9A84C" />
            </svg>
            <div className="leading-none">
              <div className="text-[13px] font-black text-white tabular-nums">{wind.speedMph}<span className="text-[9px] font-bold text-white/50"> mph</span></div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-white/45">Wind</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
