'use client'
import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import Map, { Marker, Source, Layer, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags?: Record<string, string>
}

function overpassToGeoJSON(elements: OverpassElement[]): GeoJSON.FeatureCollection {
  const nodeMap: Record<number, [number, number]> = {}
  elements.forEach(el => {
    if (el.type === 'node' && el.lat != null && el.lon != null) {
      nodeMap[el.id] = [el.lon, el.lat]
    }
  })
  const features: GeoJSON.Feature[] = []
  elements.forEach(el => {
    if (el.type !== 'way' || !el.nodes || !el.tags) return
    const coords = el.nodes.map(nid => nodeMap[nid]).filter(Boolean) as [number, number][]
    if (coords.length < 3) return
    const ring: [number, number][] =
      coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]
        ? [...coords, coords[0]]
        : coords
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { golf: el.tags.golf ?? '' },
    })
  })
  return { type: 'FeatureCollection', features }
}

interface GolfHole {
  HoleNo?: number
  Number?: number
  Par?: number
  Yardage?: number
  Yards?: number
  Handicap?: number
  TeeLatitude?: string | number
  TeeLongitude?: string | number
  GreenLatitude?: string | number
  GreenLongitude?: string | number
  Waypoints?: { lat: number; lng: number }[]
}

export interface TeeData {
  name: string
  color?: string
  yardages: (number | null)[]  // index 0 = hole 1, index 1 = hole 2, etc.
}

function parseNum(v: string | number | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(String(v))
  return isNaN(n) ? null : n
}

function holeNum(h: GolfHole) { return h.HoleNo ?? h.Number ?? 0 }

function bearingTo(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return (Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI + 360) % 360
}

const RING_YARDS = [50, 100, 150, 200]
const RING_COLOR: Record<number, string> = {
  50:  'rgba(255,255,255,0.55)',
  100: 'rgba(34,197,94,0.75)',
  150: 'rgba(251,191,36,0.75)',
  200: 'rgba(239,68,68,0.75)',
}

const PAR_COLOR: Record<number, string> = {
  3: 'rgba(96,165,250,0.85)',
  4: 'rgba(255,255,255,0.65)',
  5: 'rgba(52,211,153,0.85)',
}

export default function CourseMapbox({
  lat, lng, holes, courseName, selectedHole, onHoleClick, tees,
}: {
  lat: number
  lng: number
  holes: GolfHole[]
  courseName?: string
  selectedHole?: number
  onHoleClick?: (n: number | undefined) => void
  tees?: TeeData[]
}) {
  const mapRef   = useRef<MapRef>(null)
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const holesRef = useRef(holes)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [touring,   setTouring]   = useState(false)
  const [tourIdx,   setTourIdx]   = useState(0)
  const [osmData,   setOsmData]   = useState<GeoJSON.FeatureCollection | null>(null)

  holesRef.current = holes

  const sorted    = [...holes].sort((a, b) => holeNum(a) - holeNum(b))
  const sortedNums = sorted.map(holeNum)
  const currentIdx = selectedHole != null ? sortedNums.indexOf(selectedHole) : -1
  const prevHole   = currentIdx > 0 ? sortedNums[currentIdx - 1] : null
  const nextHole   = currentIdx < sortedNums.length - 1 ? sortedNums[currentIdx + 1] : null

  // ── Initial terrain setup ────────────────────────────────────────────────────
  const onLoad = useCallback(() => {
    if (!mapRef.current) return
    const map = mapRef.current.getMap() as any
    setMapLoaded(true)

    try {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 3.5 })

      map.setFog({
        range:            [0.8, 14],
        color:            'rgb(210, 230, 248)',
        'high-color':     'rgb(30, 75, 195)',
        'horizon-blend':  0.08,
        'space-color':    'rgb(4, 4, 18)',
        'star-intensity': 0.5,
      })

      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type':                       'atmosphere',
          'sky-atmosphere-sun':             [0.0, 75.0],
          'sky-atmosphere-sun-intensity':   18,
          'sky-atmosphere-color':           'rgba(120, 200, 245, 1.0)',
          'sky-atmosphere-halo-color':      'rgba(255, 255, 255, 0.6)',
        },
      })
    } catch (_) {}
  }, [])

  // ── Fit to full course whenever holes arrive or map finishes loading ──────────
  // Runs on both map load and holes prop change so async data is handled correctly.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || holes.length === 0 || selectedHole != null) return
    const pts: [number, number][] = []
    holes.forEach(h => {
      const tLat = parseNum(h.TeeLatitude);  const tLng = parseNum(h.TeeLongitude)
      const gLat = parseNum(h.GreenLatitude); const gLng = parseNum(h.GreenLongitude)
      if (tLat && tLng) pts.push([tLng, tLat])
      if (gLat && gLng) pts.push([gLng, gLat])
    })
    if (pts.length < 2) return
    const lngs = pts.map(p => p[0])
    const lats  = pts.map(p => p[1])
    mapRef.current.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: { top: 60, bottom: 100, left: 52, right: 52 }, duration: 1400, maxZoom: 16, pitch: 58 },
    )
  }, [mapLoaded, holes, selectedHole])

  // ── Fly when selectedHole or mapLoaded changes ────────────────────────────────
  // Using getMap().flyTo() (raw mapbox-gl instance) for guaranteed compatibility.
  // mapLoaded in deps ensures fly fires even if hole was selected before load.
  useEffect(() => {
    if (!selectedHole || !mapLoaded || !mapRef.current) return

    const hole = holesRef.current.find(h => holeNum(h) === selectedHole)
    if (!hole) return

    const tLat = parseNum(hole.TeeLatitude)
    const tLng = parseNum(hole.TeeLongitude)
    const gLat = parseNum(hole.GreenLatitude)
    const gLng = parseNum(hole.GreenLongitude)
    if (!tLat || !tLng) return

    let bearing = 0, centerLat = tLat, centerLng = tLng
    if (gLat && gLng) {
      bearing   = bearingTo(tLat, tLng, gLat, gLng)
      centerLat = (tLat + gLat) / 2
      centerLng = (tLng + gLng) / 2
    }

    const mbMap = mapRef.current.getMap() as any
    mbMap.flyTo({
      center: [centerLng, centerLat],
      zoom: 18.5,
      bearing,
      pitch: 76,
      duration: 1500,
      essential: true,
    })

    chipRefs.current[selectedHole]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedHole, mapLoaded])

  // ── Auto-tour sequencer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!touring) return
    const allSorted = [...holesRef.current].sort((a, b) => holeNum(a) - holeNum(b))
    if (allSorted.length === 0) return

    const idx = tourIdx % allSorted.length
    onHoleClick?.(holeNum(allSorted[idx]))

    const timer = setTimeout(() => {
      if (idx >= allSorted.length - 1) setTouring(false)
      else setTourIdx(i => i + 1)
    }, 3500)
    return () => clearTimeout(timer)
  }, [touring, tourIdx])

  function startTour() { if (holesRef.current.length === 0) return; setTourIdx(0); setTouring(true) }
  function stopTour()  { setTouring(false) }

  // ── Fetch OSM golf polygons ───────────────────────────────────────────────────
  useEffect(() => {
    if (!lat || !lng) return
    let cancelled = false
    const query = `[out:json][timeout:25];(way["golf"~"fairway|green|bunker|water_hazard|rough|tee"](around:2000,${lat},${lng}););(._;>;);out body;`
    fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query })
      .then(r => r.json())
      .then((d: { elements: OverpassElement[] }) => {
        if (!cancelled) setOsmData(overpassToGeoJSON(d.elements))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [lat, lng])

  // ── GeoJSON fairways ────────────────────────────────────────────────────────
  const fairways: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: holes.flatMap(h => {
      const tLat = parseNum(h.TeeLatitude);  const tLng = parseNum(h.TeeLongitude)
      const gLat = parseNum(h.GreenLatitude); const gLng = parseNum(h.GreenLongitude)
      if (!tLat || !tLng || !gLat || !gLng) return []
      const mid: [number, number][] = (h.Waypoints ?? []).map(w => [w.lng, w.lat])
      return [{ type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: [[tLng, tLat], ...mid, [gLng, gLat]] },
        properties: { holeNo: holeNum(h), par: h.Par ?? 4 },
      }]
    }),
  }

  const activeHole = selectedHole != null ? holes.find(h => holeNum(h) === selectedHole) : null

  // Active hole line for animation
  const activeFairway = useMemo((): GeoJSON.FeatureCollection => {
    if (!activeHole) return { type: 'FeatureCollection', features: [] }
    const tLat = parseNum(activeHole.TeeLatitude),  tLng = parseNum(activeHole.TeeLongitude)
    const gLat = parseNum(activeHole.GreenLatitude), gLng = parseNum(activeHole.GreenLongitude)
    if (!tLat || !tLng || !gLat || !gLng) return { type: 'FeatureCollection', features: [] }
    const mid: [number, number][] = (activeHole.Waypoints ?? []).map(w => [w.lng, w.lat])
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[tLng, tLat], ...mid, [gLng, gLat]] }, properties: {} }] }
  }, [activeHole])

  // Animate flowing dashes on active line
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current.getMap() as any
    let offset = 0
    let animId: number
    const step = () => {
      offset = (offset - 0.25 + 10) % 10
      try { map.setPaintProperty('active-flow', 'line-dash-offset', offset) } catch {}
      animId = requestAnimationFrame(step)
    }
    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [mapLoaded])

  const ringLabels = useMemo(() => {
    if (!activeHole) return []
    const gLat = parseNum(activeHole.GreenLatitude)
    const gLng = parseNum(activeHole.GreenLongitude)
    const tLat = parseNum(activeHole.TeeLatitude)
    const tLng = parseNum(activeHole.TeeLongitude)
    if (!gLat || !gLng || !tLat || !tLng) return []
    const holeYards = activeHole.Yardage ?? activeHole.Yards ?? 9999
    // Normalize in meter-space so the direction is correct regardless of latitude
    const cosLat  = Math.cos(gLat * Math.PI / 180)
    const dLat_m  = (tLat - gLat) * 111111
    const dLng_m  = (tLng - gLng) * 111111 * cosLat
    const len_m   = Math.sqrt(dLat_m * dLat_m + dLng_m * dLng_m) || 1
    const nLat_m  = dLat_m / len_m
    const nLng_m  = dLng_m / len_m
    return RING_YARDS.filter(y => y < holeYards).map(yards => {
      const m = yards * 0.9144
      return {
        yards,
        lat: gLat + nLat_m * m / 111111,
        lng: gLng + nLng_m * m / (111111 * cosLat),
        color: RING_COLOR[yards],
      }
    })
  }, [activeHole])

  const SF = { fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <style>{`
        @keyframes tee-pulse {
          0%   { transform: scale(1);   opacity: 0.9; }
          70%  { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
      `}</style>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ latitude: lat, longitude: lng, zoom: 15, pitch: 50 }}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onLoad={onLoad}
      >
        <NavigationControl position="top-right" showCompass visualizePitch />

        {/* OSM polygon fills — rendered beneath everything else */}
        {osmData && (
          <Source id="osm-golf" type="geojson" data={osmData}>
            <Layer id="osm-rough"    type="fill" filter={['==', ['get', 'golf'], 'rough']}        paint={{ 'fill-color': 'rgba(30,110,50,0.28)',   'fill-outline-color': 'rgba(30,110,50,0.45)'   }} />
            <Layer id="osm-fairway"  type="fill" filter={['==', ['get', 'golf'], 'fairway']}      paint={{ 'fill-color': 'rgba(34,197,94,0.38)',   'fill-outline-color': 'rgba(34,197,94,0.6)'    }} />
            <Layer id="osm-tee"      type="fill" filter={['==', ['get', 'golf'], 'tee']}          paint={{ 'fill-color': 'rgba(148,163,184,0.42)', 'fill-outline-color': 'rgba(148,163,184,0.65)' }} />
            <Layer id="osm-bunker"   type="fill" filter={['==', ['get', 'golf'], 'bunker']}       paint={{ 'fill-color': 'rgba(251,211,141,0.65)', 'fill-outline-color': 'rgba(234,179,8,0.75)'   }} />
            <Layer id="osm-water"    type="fill" filter={['==', ['get', 'golf'], 'water_hazard']} paint={{ 'fill-color': 'rgba(56,130,246,0.55)',  'fill-outline-color': 'rgba(56,130,246,0.8)'   }} />
            <Layer id="osm-green"    type="fill" filter={['==', ['get', 'golf'], 'green']}        paint={{ 'fill-color': 'rgba(74,222,128,0.55)',  'fill-outline-color': 'rgba(74,222,128,0.85)'  }} />
          </Source>
        )}

        {/* Yardage labels around green */}
        {ringLabels.map(r => (
          <Marker key={`ring-${r.yards}`} latitude={r.lat} longitude={r.lng} anchor="bottom">
            <div style={{ ...SF, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', border: `1px solid ${r.color}`, borderRadius: 5, padding: '2px 6px', fontSize: 9, fontWeight: 800, color: r.color, letterSpacing: 0.5, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              {r.yards}y
            </div>
          </Marker>
        ))}

        {/* Par-colored fairway lines — dimmed when a hole is active */}
        <Source id="fairways" type="geojson" data={fairways}>
          <Layer id="fairway-glow" type="line" paint={{ 'line-color': 'rgba(255,255,255,0.08)', 'line-width': 10, 'line-blur': 8, 'line-opacity': activeHole ? 0.4 : 1 }} />
          <Layer
            id="fairway-lines"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['==', ['get', 'par'], 3], 'rgba(96,165,250,0.7)',
                ['==', ['get', 'par'], 5], 'rgba(52,211,153,0.7)',
                'rgba(255,255,255,0.38)',
              ],
              'line-width': 1.5,
              'line-opacity': activeHole ? 0.35 : 1,
            }}
          />
        </Source>

        {/* Active hole — wide glow + animated flowing dashes */}
        <Source id="active-fairway" type="geojson" data={activeFairway}>
          <Layer id="active-glow-wide" type="line" paint={{ 'line-color': '#C9A84C', 'line-width': 30, 'line-blur': 24, 'line-opacity': 0.35 }} />
          <Layer id="active-glow" type="line" paint={{ 'line-color': '#FFFFFF', 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.25 }} />
          <Layer id="active-flow" type="line" paint={{ 'line-color': '#FFFFFF', 'line-width': 3, 'line-dasharray': [4, 3], 'line-opacity': 1 } as any} />
        </Source>

        {/* Tee markers */}
        {holes.map(h => {
          const tLat = parseNum(h.TeeLatitude)
          const tLng = parseNum(h.TeeLongitude)
          const n    = holeNum(h)
          const active = selectedHole === n
          if (!tLat || !tLng) return null
          return (
            <Marker key={`tee-${n}`} latitude={tLat} longitude={tLng} anchor="center">
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {active && (
                  <div style={{ position: 'absolute', inset: -10, borderRadius: 16, border: '2px solid rgba(201,168,76,0.6)', animation: 'tee-pulse 1.8s ease-out infinite' }} />
                )}
                <div
                  onClick={() => { stopTour(); onHoleClick?.(n) }}
                  style={{
                    width: active ? 36 : 28,
                    height: active ? 36 : 28,
                    background: active
                      ? 'linear-gradient(145deg, #D4AF45 0%, #8B6420 100%)'
                      : 'linear-gradient(145deg, rgba(20,14,4,0.95) 0%, rgba(0,0,0,0.9) 100%)',
                    border: `${active ? 2 : 1.5}px solid ${active ? '#FFD700' : '#C9A84C'}`,
                    borderRadius: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: active
                      ? '0 0 0 5px rgba(201,168,76,0.35), 0 8px 24px rgba(0,0,0,0.9)'
                      : '0 0 0 3px rgba(201,168,76,0.15), 0 4px 12px rgba(0,0,0,0.7)',
                    cursor: 'pointer',
                    transform: active ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                    zIndex: active ? 10 : 1,
                    position: 'relative',
                  }}
                >
                  <span style={{ ...SF, color: active ? '#fff' : '#E8C96A', fontSize: n > 9 ? 10 : 12, fontWeight: 900, lineHeight: 1, letterSpacing: -0.5 }}>{n}</span>
                </div>
              </div>
            </Marker>
          )
        })}

        {/* Green markers — flag pins */}
        {holes.map(h => {
          const gLat = parseNum(h.GreenLatitude)
          const gLng = parseNum(h.GreenLongitude)
          const n    = holeNum(h)
          const active = selectedHole === n
          if (!gLat || !gLng) return null
          const scale = active ? 1.4 : 1
          return (
            <Marker key={`green-${n}`} latitude={gLat} longitude={gLng} anchor="bottom">
              <div
                onClick={() => { stopTour(); onHoleClick?.(n) }}
                style={{
                  cursor: 'pointer',
                  transform: `scale(${scale})`,
                  transformOrigin: 'bottom center',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  filter: active
                    ? 'drop-shadow(0 0 6px rgba(239,68,68,0.9)) drop-shadow(0 2px 6px rgba(0,0,0,0.8))'
                    : 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))',
                }}
              >
                <svg width="20" height="34" viewBox="0 0 20 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Pole */}
                  <line x1="5" y1="1" x2="5" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  {/* Flag */}
                  <polygon points="5,2 19,8 5,14" fill="#EF4444"/>
                  <polygon points="5,2 19,8 5,14" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5"/>
                  {/* Base */}
                  <circle cx="5" cy="32" r="3.5" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5"/>
                </svg>
              </div>
            </Marker>
          )
        })}
      </Map>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.4) 100%)' }} />

      {/* ── Top bar: hole info + nav ── */}
      {activeHole ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2">
          <button onClick={() => prevHole != null && onHoleClick?.(prevHole)} disabled={prevHole == null}
            style={{ ...SF, width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', color: prevHole != null ? '#fff' : 'rgba(255,255,255,0.15)', fontSize: 18, fontWeight: 700, cursor: prevHole != null ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
          >‹</button>

          <div style={{ background: 'linear-gradient(160deg, rgba(10,8,4,0.88) 0%, rgba(20,15,5,0.82) 100%)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 14, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <div style={{ textAlign: 'center', minWidth: 32 }}>
              <div style={{ ...SF, color: '#C9A84C', fontSize: 8, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>
                {touring ? `${selectedHole}/${sorted.length}` : 'HOLE'}
              </div>
              <div style={{ ...SF, color: '#fff', fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{selectedHole}</div>
            </div>

            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />

            <div style={{ textAlign: 'center', minWidth: 28 }}>
              <div style={{ ...SF, color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>PAR</div>
              <div style={{ ...SF, color: activeHole.Par === 3 ? '#60A5FA' : activeHole.Par === 5 ? '#34D399' : '#fff', fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{activeHole.Par ?? '—'}</div>
            </div>

            {(activeHole.Yardage ?? activeHole.Yards) && <>
              <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ textAlign: 'center', minWidth: 44 }}>
                <div style={{ ...SF, color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>YDS</div>
                <div style={{ ...SF, color: '#C9A84C', fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{activeHole.Yardage ?? activeHole.Yards}</div>
              </div>
            </>}

            {activeHole.Handicap != null && <>
              <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ textAlign: 'center', minWidth: 24 }}>
                <div style={{ ...SF, color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>HCP</div>
                <div style={{ ...SF, color: 'rgba(255,255,255,0.7)', fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{activeHole.Handicap}</div>
              </div>
            </>}
          </div>

          <button onClick={() => nextHole != null && onHoleClick?.(nextHole)} disabled={nextHole == null}
            style={{ ...SF, width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', color: nextHole != null ? '#fff' : 'rgba(255,255,255,0.15)', fontSize: 18, fontWeight: 700, cursor: nextHole != null ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
          >›</button>
        </div>
      ) : (
        <div className="absolute top-3 left-3">
          {courseName && (
            <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '6px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
              <span style={{ ...SF, color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: 700, letterSpacing: 0.2 }}>{courseName}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Tour button ── */}
      {sorted.length > 0 && (
        <div className="absolute bottom-[76px] left-3">
          <button onClick={touring ? stopTour : startTour}
            style={{ ...SF, background: touring ? 'rgba(220,38,38,0.85)' : 'linear-gradient(135deg, rgba(201,168,76,0.92), rgba(120,80,20,0.88))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${touring ? 'rgba(239,68,68,0.4)' : 'rgba(255,210,60,0.3)'}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 0.6, boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}
          >
            {touring ? '⏹ Stop' : '▶ Fly Tour'}
          </button>
        </div>
      )}

      {/* ── Tour progress bar ── */}
      {touring && (
        <div className="absolute bottom-[58px] left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 160 }}>
          <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#C9A84C', width: `${((tourIdx % sorted.length) / Math.max(sorted.length - 1, 1)) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* ── Bottom: hole chip strip ── */}
      {sorted.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)', paddingBottom: 10, paddingTop: 32 }}>
          <div className="pointer-events-auto overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div style={{ display: 'flex', gap: 5, paddingLeft: 10, paddingRight: 10, width: 'max-content', alignItems: 'flex-end' }}>
              {sorted.map(h => {
                const n        = holeNum(h)
                const par      = h.Par ?? 4
                const active   = selectedHole === n
                const parColor = PAR_COLOR[par] ?? PAR_COLOR[4]
                return (
                  <button
                    key={n}
                    ref={el => { chipRefs.current[n] = el }}
                    onClick={() => { stopTour(); onHoleClick?.(active ? undefined : n) }}
                    style={{
                      width:        active ? 48 : 36,
                      height:       active ? 56 : 44,
                      borderRadius: active ? 12 : 10,
                      background:   active
                        ? 'linear-gradient(160deg, #D4AF45 0%, #7A5215 100%)'
                        : 'rgba(12,10,6,0.72)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: `1px solid ${active ? 'rgba(255,210,60,0.65)' : 'rgba(255,255,255,0.07)'}`,
                      boxShadow: active
                        ? '0 6px 24px rgba(201,168,76,0.55), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                      cursor: 'pointer',
                      transform: active ? 'translateY(-6px)' : 'translateY(0)',
                      transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ ...SF, color: active ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: n > 9 ? 10 : 12, fontWeight: 900, lineHeight: 1, letterSpacing: -0.3 }}>{n}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.5)' : parColor, boxShadow: active ? 'none' : `0 0 6px ${parColor}` }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Par legend (no hole selected) ── */}
      {holes.length > 0 && !selectedHole && (
        <div className="absolute bottom-16 right-3 pointer-events-none flex flex-col gap-1.5"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 10px' }}>
          {[{ par: 3, label: 'Par 3', color: 'rgba(96,165,250,0.85)' }, { par: 4, label: 'Par 4', color: 'rgba(255,255,255,0.65)' }, { par: 5, label: 'Par 5', color: 'rgba(52,211,153,0.85)' }].map(({ par, label, color }) => (
            <div key={par} className="flex items-center gap-2">
              <div style={{ width: 18, height: 2.5, borderRadius: 2, background: color }} />
              <span style={{ ...SF, color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
