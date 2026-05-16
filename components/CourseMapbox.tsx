'use client'
import { useRef, useCallback, useEffect, useState } from 'react'
import Map, { Marker, Source, Layer, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

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
  lat, lng, holes, courseName, selectedHole, onHoleClick,
}: {
  lat: number
  lng: number
  holes: GolfHole[]
  courseName?: string
  selectedHole?: number
  onHoleClick?: (n: number) => void
}) {
  const mapRef      = useRef<MapRef>(null)
  const chipRefs    = useRef<Record<number, HTMLButtonElement | null>>({})
  const [touring,   setTouring]   = useState(false)
  const [tourIdx,   setTourIdx]   = useState(0)

  const sorted = [...holes].sort((a, b) => holeNum(a) - holeNum(b))

  // ── Initial fit + terrain ────────────────────────────────────────────────────
  const onLoad = useCallback(() => {
    if (!mapRef.current) return
    const map = mapRef.current.getMap() as any

    // 3-D terrain
    try {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 2.0 })
    } catch (_) {}

    if (sorted.length === 0) return
    const pts: [number, number][] = []
    sorted.forEach(h => {
      const tLat = parseNum(h.TeeLatitude);  const tLng = parseNum(h.TeeLongitude)
      const gLat = parseNum(h.GreenLatitude); const gLng = parseNum(h.GreenLongitude)
      if (tLat && tLng) pts.push([tLng, tLat])
      if (gLat && gLng) pts.push([gLng, gLat])
    })
    if (pts.length >= 2) {
      const lngs = pts.map(p => p[0])
      const lats = pts.map(p => p[1])
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 60, bottom: 100, left: 52, right: 52 }, duration: 1400, maxZoom: 17, pitch: 20 },
      )
    }
  }, [sorted])

  // ── Fly to hole ──────────────────────────────────────────────────────────────
  const flyToHole = useCallback((holeNumber: number) => {
    if (!mapRef.current) return
    const hole = holes.find(h => holeNum(h) === holeNumber)
    if (!hole) return
    const tLat = parseNum(hole.TeeLatitude)
    const tLng = parseNum(hole.TeeLongitude)
    const gLat = parseNum(hole.GreenLatitude)
    const gLng = parseNum(hole.GreenLongitude)
    if (!tLat || !tLng) return

    let bearing = 0, centerLat = tLat, centerLng = tLng
    if (gLat && gLng) {
      bearing    = bearingTo(tLat, tLng, gLat, gLng)
      centerLat  = (tLat + gLat) / 2
      centerLng  = (tLng + gLng) / 2
    }
    mapRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom: 17,
      bearing,
      pitch: 42,
      duration: touring ? 2200 : 1300,
      essential: true,
    })
  }, [holes, touring])

  // ── Fly when selectedHole changes ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedHole) return
    flyToHole(selectedHole)
    chipRefs.current[selectedHole]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedHole, flyToHole])

  // ── Auto-tour sequencer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!touring || sorted.length === 0) return
    const idx  = tourIdx % sorted.length
    const hole = sorted[idx]
    const n    = holeNum(hole)
    onHoleClick?.(n)

    const timer = setTimeout(() => {
      if (idx >= sorted.length - 1) {
        setTouring(false)
      } else {
        setTourIdx(i => i + 1)
      }
    }, 3200)
    return () => clearTimeout(timer)
  }, [touring, tourIdx])

  function startTour() {
    if (sorted.length === 0) return
    setTourIdx(0)
    setTouring(true)
  }
  function stopTour() { setTouring(false) }

  // ── GeoJSON fairways (par-colored) ───────────────────────────────────────────
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

  const activeHole = selectedHole ? holes.find(h => holeNum(h) === selectedHole) : null

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ latitude: lat, longitude: lng, zoom: 15, pitch: 20 }}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onLoad={onLoad}
      >
        <NavigationControl position="bottom-right" showCompass visualizePitch />

        {/* Glow */}
        <Source id="fairways-glow" type="geojson" data={fairways}>
          <Layer id="fairway-glow" type="line" paint={{ 'line-color': 'rgba(255,255,255,0.1)', 'line-width': 10, 'line-blur': 6 }} />
        </Source>

        {/* Par-colored fairway lines */}
        <Source id="fairways" type="geojson" data={fairways}>
          <Layer
            id="fairway-lines"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['==', ['get', 'holeNo'], selectedHole ?? -1], 'rgba(201,168,76,0.95)',
                ['==', ['get', 'par'], 3], 'rgba(96,165,250,0.8)',
                ['==', ['get', 'par'], 5], 'rgba(52,211,153,0.8)',
                'rgba(255,255,255,0.6)',
              ],
              'line-width': ['case', ['==', ['get', 'holeNo'], selectedHole ?? -1], 2.8, 1.8],
              'line-dasharray': ['case', ['==', ['get', 'holeNo'], selectedHole ?? -1], ['literal', [1]], ['literal', [1]]],
            }}
          />
        </Source>

        {/* Tee markers */}
        {holes.map(h => {
          const tLat = parseNum(h.TeeLatitude)
          const tLng = parseNum(h.TeeLongitude)
          const n = holeNum(h)
          const active = selectedHole === n
          if (!tLat || !tLng) return null
          return (
            <Marker key={`tee-${n}`} latitude={tLat} longitude={tLng} anchor="center">
              <div
                onClick={() => { stopTour(); onHoleClick?.(n) }}
                style={{
                  width: active ? 36 : 30,
                  height: active ? 36 : 30,
                  background: active
                    ? 'linear-gradient(145deg, #D4AF45 0%, #8B6420 100%)'
                    : 'linear-gradient(145deg, rgba(24,18,6,0.97) 0%, rgba(6,6,6,0.93) 100%)',
                  border: `${active ? 2 : 1.5}px solid ${active ? '#FFD700' : '#C9A84C'}`,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active
                    ? '0 0 0 5px rgba(201,168,76,0.3), 0 8px 32px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,215,0,0.35)'
                    : '0 0 0 3px rgba(201,168,76,0.18), 0 6px 20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(201,168,76,0.12)',
                  cursor: 'pointer',
                  transform: active ? 'scale(1.12)' : 'scale(1)',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  zIndex: active ? 10 : 1,
                  animation: active ? 'none' : undefined,
                }}
              >
                <span style={{ color: active ? '#fff' : '#E8C96A', fontSize: n > 9 ? 10 : 12, fontWeight: 900, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', lineHeight: 1, letterSpacing: -0.5, textShadow: active ? '0 1px 3px rgba(0,0,0,0.6)' : '0 1px 4px rgba(201,168,76,0.6)' }}>{n}</span>
              </div>
            </Marker>
          )
        })}

        {/* Green markers */}
        {holes.map(h => {
          const gLat = parseNum(h.GreenLatitude)
          const gLng = parseNum(h.GreenLongitude)
          const n = holeNum(h)
          const active = selectedHole === n
          if (!gLat || !gLng) return null
          return (
            <Marker key={`green-${n}`} latitude={gLat} longitude={gLng} anchor="center">
              <div
                onClick={() => { stopTour(); onHoleClick?.(n) }}
                style={{
                  width: active ? 20 : 14,
                  height: active ? 20 : 14,
                  background: 'radial-gradient(circle at 35% 35%, #4ade80, #16a34a)',
                  border: `${active ? 3 : 2}px solid rgba(255,255,255,${active ? 1 : 0.85})`,
                  borderRadius: '50%',
                  boxShadow: active
                    ? '0 0 0 5px rgba(34,197,94,0.35), 0 0 24px rgba(34,197,94,0.75), 0 4px 12px rgba(0,0,0,0.7)'
                    : '0 0 0 3px rgba(34,197,94,0.25), 0 0 10px rgba(34,197,94,0.45), 0 3px 8px rgba(0,0,0,0.6)',
                  cursor: 'pointer',
                  transform: active ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </Marker>
          )
        })}
      </Map>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />

      {/* ── Top-left: course name + tour button ── */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
        {courseName && (
          <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: '5px 10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: 0.2 }}>{courseName}</span>
          </div>
        )}
        {sorted.length > 0 && (
          <button
            className="pointer-events-auto flex items-center gap-2"
            onClick={touring ? stopTour : startTour}
            style={{
              background: touring ? 'rgba(239,68,68,0.85)' : 'rgba(201,168,76,0.92)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${touring ? 'rgba(239,68,68,0.5)' : 'rgba(255,215,0,0.4)'}`,
              borderRadius: 10,
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: touring ? '#fff' : '#1a0f00', fontFamily: '-apple-system, sans-serif', letterSpacing: 0.5 }}>
              {touring
                ? `⏹ Stop Tour`
                : '▶ Fly Tour'}
            </span>
          </button>
        )}
      </div>

      {/* ── Top-right: hole callout ── */}
      {activeHole && (
        <div className="absolute top-3 right-3 pointer-events-none">
          <div style={{ background: 'rgba(0,0,0,0.68)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 14, padding: '10px 16px', minWidth: 96, transition: 'all 0.3s ease' }}>
            <div style={{ color: 'rgba(201,168,76,0.85)', fontSize: 9, fontWeight: 800, letterSpacing: 1.8, fontFamily: '-apple-system, sans-serif', textTransform: 'uppercase', marginBottom: 4 }}>
              {touring ? `Hole ${selectedHole} of ${sorted.length}` : `Hole ${selectedHole}`}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: activeHole.Par === 3 ? '#93C5FD' : activeHole.Par === 5 ? '#6EE7B7' : '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1, fontFamily: '-apple-system, sans-serif' }}>{activeHole.Par ?? '—'}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, fontFamily: '-apple-system, sans-serif', marginTop: 2 }}>PAR</div>
              </div>
              {(activeHole.Yardage ?? activeHole.Yards) && (
                <>
                  <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.12)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#C9A84C', fontSize: 26, fontWeight: 900, lineHeight: 1, fontFamily: '-apple-system, sans-serif' }}>{activeHole.Yardage ?? activeHole.Yards}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, fontFamily: '-apple-system, sans-serif', marginTop: 2 }}>YDS</div>
                  </div>
                </>
              )}
              {activeHole.Handicap != null && (
                <>
                  <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.12)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 26, fontWeight: 900, lineHeight: 1, fontFamily: '-apple-system, sans-serif' }}>{activeHole.Handicap}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, fontFamily: '-apple-system, sans-serif', marginTop: 2 }}>HCP</div>
                  </div>
                </>
              )}
            </div>
            {/* Tour progress bar */}
            {touring && (
              <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#C9A84C', borderRadius: 1, width: `${((tourIdx % sorted.length) / Math.max(sorted.length - 1, 1)) * 100}%`, transition: 'width 0.4s ease' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom: hole chip strip ── */}
      {sorted.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', paddingBottom: 12, paddingTop: 24 }}>
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
                    onClick={() => { stopTour(); onHoleClick?.(active ? undefined as any : n) }}
                    style={{
                      width: active ? 50 : 42,
                      height: active ? 54 : 46,
                      borderRadius: 10,
                      background: active
                        ? 'rgba(201,168,76,0.95)'
                        : 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: `1.5px solid ${active ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.12)'}`,
                      boxShadow: active ? '0 4px 16px rgba(201,168,76,0.4)' : '0 2px 8px rgba(0,0,0,0.4)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                      cursor: 'pointer',
                      transform: active ? 'translateY(-4px) scale(1.05)' : 'translateY(0) scale(1)',
                      transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: active ? '#1a0f00' : '#fff', fontSize: n > 9 ? 11 : 13, fontWeight: 900, lineHeight: 1, fontFamily: '-apple-system, sans-serif' }}>{n}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? 'rgba(0,0,0,0.35)' : parColor, boxShadow: active ? 'none' : `0 0 5px ${parColor}` }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Par color legend (bottom-right corner) ── */}
      {holes.length > 0 && !selectedHole && (
        <div className="absolute bottom-16 right-3 pointer-events-none flex flex-col gap-1.5"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px' }}>
          {[{ par: 3, label: 'Par 3', color: 'rgba(96,165,250,0.85)' }, { par: 4, label: 'Par 4', color: 'rgba(255,255,255,0.65)' }, { par: 5, label: 'Par 5', color: 'rgba(52,211,153,0.85)' }].map(({ par, label, color }) => (
            <div key={par} className="flex items-center gap-2">
              <div style={{ width: 20, height: 2.5, borderRadius: 2, background: color }} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, fontFamily: '-apple-system, sans-serif' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
