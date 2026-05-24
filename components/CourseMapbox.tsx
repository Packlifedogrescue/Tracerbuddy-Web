'use client'
import { useRef, useCallback, useEffect, useState } from 'react'
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
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
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
      { padding: { top: 60, bottom: 100, left: 52, right: 52 }, duration: 1400, maxZoom: 16, pitch: 20 },
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
      pitch: 50,
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
      return [{ type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: [[tLng, tLat], [gLng, gLat]] },
        properties: { holeNo: holeNum(h), par: h.Par ?? 4 },
      }]
    }),
  }

  const activeHole = selectedHole != null ? holes.find(h => holeNum(h) === selectedHole) : null


  const SF = { fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ latitude: lat, longitude: lng, zoom: 15, pitch: 20 }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onLoad={onLoad}
      >
        <NavigationControl position="bottom-right" showCompass visualizePitch />

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

        {/* Fairway glow */}
        <Source id="fairways-glow" type="geojson" data={fairways}>
          <Layer id="fairway-glow" type="line" paint={{ 'line-color': 'rgba(255,255,255,0.12)', 'line-width': 12, 'line-blur': 8 }} />
        </Source>

        {/* Par-colored fairway lines */}
        <Source id="fairways" type="geojson" data={fairways}>
          <Layer
            id="fairway-lines"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['==', ['get', 'holeNo'], selectedHole ?? -1], '#FFFFFF',
                ['==', ['get', 'par'], 3], 'rgba(96,165,250,0.8)',
                ['==', ['get', 'par'], 5], 'rgba(52,211,153,0.8)',
                'rgba(255,255,255,0.45)',
              ],
              'line-width': ['case', ['==', ['get', 'holeNo'], selectedHole ?? -1], 3, 1.8],
            }}
          />
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
                }}
              >
                <span style={{ ...SF, color: active ? '#fff' : '#E8C96A', fontSize: n > 9 ? 10 : 12, fontWeight: 900, lineHeight: 1, letterSpacing: -0.5 }}>{n}</span>
              </div>
            </Marker>
          )
        })}

        {/* Green markers */}
        {holes.map(h => {
          const gLat = parseNum(h.GreenLatitude)
          const gLng = parseNum(h.GreenLongitude)
          const n    = holeNum(h)
          const active = selectedHole === n
          if (!gLat || !gLng) return null
          return (
            <Marker key={`green-${n}`} latitude={gLat} longitude={gLng} anchor="center">
              <div
                onClick={() => { stopTour(); onHoleClick?.(n) }}
                style={{
                  width: active ? 20 : 13,
                  height: active ? 20 : 13,
                  background: 'radial-gradient(circle at 35% 35%, #4ade80, #15803d)',
                  border: `${active ? 3 : 2}px solid rgba(255,255,255,${active ? 1 : 0.8})`,
                  borderRadius: '50%',
                  boxShadow: active
                    ? '0 0 0 5px rgba(34,197,94,0.3), 0 0 20px rgba(34,197,94,0.7)'
                    : '0 0 0 2px rgba(34,197,94,0.2), 0 0 8px rgba(34,197,94,0.4)',
                  cursor: 'pointer',
                  transform: active ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </Marker>
          )
        })}
      </Map>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.4) 100%)' }} />

      {/* ── Top bar: hole info + nav ── */}
      {activeHole ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2">
          {/* Prev */}
          <button
            onClick={() => prevHole != null && onHoleClick?.(prevHole)}
            disabled={prevHole == null}
            style={{ ...SF, width: 32, height: 32, borderRadius: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', color: prevHole != null ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 16, fontWeight: 700, cursor: prevHole != null ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >‹</button>

          {/* Hole pill */}
          <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(201,168,76,0.45)', borderRadius: 12, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...SF, color: 'rgba(201,168,76,0.8)', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>
                {touring ? `${selectedHole} of ${sorted.length}` : 'Hole'}
              </div>
              <div style={{ ...SF, color: '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{selectedHole}</div>
            </div>

            <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{ ...SF, color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>Par</div>
              <div style={{ ...SF, color: activeHole.Par === 3 ? '#93C5FD' : activeHole.Par === 5 ? '#6EE7B7' : '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{activeHole.Par ?? '—'}</div>
            </div>

            {(activeHole.Yardage ?? activeHole.Yards) && (
              <>
                <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...SF, color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>Yds</div>
                  <div style={{ ...SF, color: '#C9A84C', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{activeHole.Yardage ?? activeHole.Yards}</div>
                </div>
              </>
            )}

            {activeHole.Handicap != null && (
              <>
                <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...SF, color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>HCP</div>
                  <div style={{ ...SF, color: 'rgba(255,255,255,0.75)', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{activeHole.Handicap}</div>
                </div>
              </>
            )}
          </div>

          {/* Next */}
          <button
            onClick={() => nextHole != null && onHoleClick?.(nextHole)}
            disabled={nextHole == null}
            style={{ ...SF, width: 32, height: 32, borderRadius: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', color: nextHole != null ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 16, fontWeight: 700, cursor: nextHole != null ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >›</button>
        </div>
      ) : (
        /* Course name + tour button when no hole selected */
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {courseName && (
            <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: '5px 10px' }}>
              <span style={{ ...SF, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700 }}>{courseName}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Tour button (bottom-left, above chip strip) ── */}
      {sorted.length > 0 && (
        <div className="absolute bottom-[68px] left-3">
          <button
            onClick={touring ? stopTour : startTour}
            style={{ ...SF, background: touring ? 'rgba(239,68,68,0.88)' : 'rgba(201,168,76,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: `1px solid ${touring ? 'rgba(239,68,68,0.5)' : 'rgba(255,215,0,0.4)'}`, borderRadius: 10, padding: '6px 12px', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: 11, fontWeight: 800, color: touring ? '#fff' : '#1a0f00', letterSpacing: 0.5 }}
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
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)', paddingBottom: 12, paddingTop: 28 }}>
          <div className="pointer-events-auto overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div style={{ display: 'flex', gap: 6, paddingLeft: 12, paddingRight: 12, width: 'max-content' }}>
              {sorted.map(h => {
                const n      = holeNum(h)
                const par    = h.Par ?? 4
                const active = selectedHole === n
                const parColor = PAR_COLOR[par] ?? PAR_COLOR[4]
                return (
                  <button
                    key={n}
                    ref={el => { chipRefs.current[n] = el }}
                    onClick={() => { stopTour(); onHoleClick?.(active ? undefined : n) }}
                    style={{
                      width: active ? 50 : 40,
                      height: active ? 54 : 44,
                      borderRadius: 10,
                      background: active ? 'rgba(201,168,76,0.95)' : 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: `1.5px solid ${active ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: active ? '0 4px 16px rgba(201,168,76,0.4)' : '0 2px 6px rgba(0,0,0,0.4)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                      cursor: 'pointer',
                      transform: active ? 'translateY(-4px) scale(1.05)' : 'translateY(0)',
                      transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ ...SF, color: active ? '#1a0f00' : '#fff', fontSize: n > 9 ? 10 : 12, fontWeight: 900, lineHeight: 1 }}>{n}</span>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? 'rgba(0,0,0,0.3)' : parColor, boxShadow: active ? 'none' : `0 0 5px ${parColor}` }} />
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
