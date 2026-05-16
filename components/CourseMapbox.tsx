'use client'
import { useRef, useCallback, useEffect } from 'react'
import Map, { Marker, Source, Layer, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

interface GolfHole {
  HoleNo?: number
  Number?: number
  Par?: number
  Yardage?: number
  Yards?: number
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
  const mapRef = useRef<MapRef>(null)

  const onLoad = useCallback(() => {
    if (!mapRef.current || holes.length === 0) return
    const pts: [number, number][] = []
    holes.forEach(h => {
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
        { padding: { top: 52, bottom: 52, left: 52, right: 52 }, duration: 1400, maxZoom: 18 },
      )
    }
  }, [holes])

  // Sweep to selected hole
  useEffect(() => {
    if (!mapRef.current || !selectedHole) return
    const hole = holes.find(h => holeNum(h) === selectedHole)
    if (!hole) return

    const tLat = parseNum(hole.TeeLatitude)
    const tLng = parseNum(hole.TeeLongitude)
    const gLat = parseNum(hole.GreenLatitude)
    const gLng = parseNum(hole.GreenLongitude)

    if (!tLat || !tLng) return

    let bearing = 0
    let centerLat = tLat
    let centerLng = tLng

    if (gLat && gLng) {
      bearing = bearingTo(tLat, tLng, gLat, gLng)
      centerLat = (tLat + gLat) / 2
      centerLng = (tLng + gLng) / 2
    }

    mapRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom: 17,
      bearing,
      pitch: 28,
      duration: 1300,
      essential: true,
    })
  }, [selectedHole, holes])

  // GeoJSON for fairway lines
  const fairways: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: holes.flatMap(h => {
      const tLat = parseNum(h.TeeLatitude);  const tLng = parseNum(h.TeeLongitude)
      const gLat = parseNum(h.GreenLatitude); const gLng = parseNum(h.GreenLongitude)
      if (!tLat || !tLng || !gLat || !gLng) return []
      return [{
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: [[tLng, tLat], [gLng, gLat]] },
        properties: { holeNo: holeNum(h) },
      }]
    }),
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ latitude: lat, longitude: lng, zoom: 15 }}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onLoad={onLoad}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Glow layer */}
        <Source id="fairways-glow" type="geojson" data={fairways}>
          <Layer
            id="fairway-glow"
            type="line"
            paint={{
              'line-color': 'rgba(255,255,255,0.12)',
              'line-width': 8,
              'line-blur': 4,
            }}
          />
        </Source>

        {/* Main fairway line */}
        <Source id="fairways" type="geojson" data={fairways}>
          <Layer
            id="fairway-lines"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['==', ['get', 'holeNo'], selectedHole ?? -1],
                'rgba(201,168,76,0.9)',
                'rgba(255,255,255,0.55)',
              ],
              'line-width': [
                'case',
                ['==', ['get', 'holeNo'], selectedHole ?? -1],
                2.5,
                1.5,
              ],
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
                onClick={() => onHoleClick?.(n)}
                title={`Hole ${n} — Par ${h.Par ?? '?'}${h.Yardage ? ' · ' + h.Yardage + ' yds' : ''}`}
                style={{
                  width: active ? 34 : 30,
                  height: active ? 34 : 30,
                  background: active
                    ? 'linear-gradient(145deg, #C9A84C 0%, #8B6420 100%)'
                    : 'linear-gradient(145deg, rgba(28,22,8,0.96) 0%, rgba(8,8,8,0.92) 100%)',
                  border: `${active ? 2 : 1.5}px solid ${active ? '#FFD700' : '#C9A84C'}`,
                  borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active
                    ? '0 0 0 4px rgba(201,168,76,0.35), 0 8px 32px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,215,0,0.4)'
                    : '0 0 0 3px rgba(201,168,76,0.2), 0 6px 24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(201,168,76,0.15)',
                  cursor: 'pointer',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                  zIndex: active ? 10 : 1,
                }}
              >
                <span style={{
                  color: active ? '#fff' : '#E8C96A',
                  fontSize: n > 9 ? 10 : 12,
                  fontWeight: 900,
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  lineHeight: 1,
                  letterSpacing: -0.5,
                  textShadow: active ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 4px rgba(201,168,76,0.6)',
                }}>{n}</span>
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
                onClick={() => onHoleClick?.(n)}
                title={`Hole ${n} — Green`}
                style={{
                  width: active ? 18 : 14,
                  height: active ? 18 : 14,
                  background: 'radial-gradient(circle at 35% 35%, #4ade80, #16a34a)',
                  border: `${active ? 2.5 : 2}px solid rgba(255,255,255,${active ? 1 : 0.9})`,
                  borderRadius: '50%',
                  boxShadow: active
                    ? '0 0 0 4px rgba(34,197,94,0.4), 0 0 20px rgba(34,197,94,0.7), 0 3px 10px rgba(0,0,0,0.6)'
                    : '0 0 0 3px rgba(34,197,94,0.3), 0 0 12px rgba(34,197,94,0.5), 0 3px 10px rgba(0,0,0,0.6)',
                  cursor: 'pointer',
                  transform: active ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </Marker>
          )
        })}
      </Map>

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.5) 100%)' }}
      />

      {/* Course name watermark */}
      {courseName && (
        <div className="absolute top-3 left-3 pointer-events-none">
          <div style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 10,
            padding: '5px 10px',
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: 0.2,
            }}>{courseName}</span>
          </div>
        </div>
      )}

      {/* Selected hole callout */}
      {selectedHole && (() => {
        const h = holes.find(hh => holeNum(hh) === selectedHole)
        if (!h) return null
        return (
          <div className="absolute top-3 right-3 pointer-events-none">
            <div style={{
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(201,168,76,0.5)',
              borderRadius: 12,
              padding: '8px 14px',
              minWidth: 90,
            }}>
              <div style={{ color: 'rgba(201,168,76,0.8)', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, fontFamily: '-apple-system, sans-serif', textTransform: 'uppercase', marginBottom: 3 }}>
                Hole {selectedHole}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontSize: 22, fontWeight: 900, lineHeight: 1, fontFamily: '-apple-system, sans-serif' }}>
                    {h.Par ?? '—'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 600, fontFamily: '-apple-system, sans-serif', marginTop: 2 }}>PAR</div>
                </div>
                {(h.Yardage ?? h.Yards) && (
                  <>
                    <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#C9A84C', fontSize: 22, fontWeight: 900, lineHeight: 1, fontFamily: '-apple-system, sans-serif' }}>
                        {h.Yardage ?? h.Yards}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 600, fontFamily: '-apple-system, sans-serif', marginTop: 2 }}>YDS</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Legend */}
      {holes.length > 0 && (
        <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-3"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '6px 12px',
          }}
        >
          <div className="flex items-center gap-1.5">
            <div style={{ width: 14, height: 14, borderRadius: 4, background: 'linear-gradient(145deg, rgba(28,22,8,0.96), rgba(8,8,8,0.92))', border: '1.5px solid #C9A84C', boxShadow: '0 0 0 2px rgba(201,168,76,0.2)' }} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: 600, fontFamily: '-apple-system, sans-serif' }}>Tee</span>
          </div>
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
          <div className="flex items-center gap-1.5">
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #4ade80, #16a34a)', border: '1.5px solid rgba(255,255,255,0.85)', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: 600, fontFamily: '-apple-system, sans-serif' }}>Green</span>
          </div>
          {selectedHole && (
            <>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
              <span style={{ color: 'rgba(201,168,76,0.9)', fontSize: 10.5, fontWeight: 700, fontFamily: '-apple-system, sans-serif' }}>
                Tap hole to sweep ↑
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
