'use client'
import { useRef, useCallback } from 'react'
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

export default function CourseMapbox({
  lat, lng, holes, courseName,
}: {
  lat: number
  lng: number
  holes: GolfHole[]
  courseName?: string
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
        properties: {},
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

        {/* Glow layer — wide soft line behind the main line */}
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
              'line-color': 'rgba(255,255,255,0.65)',
              'line-width': 1.5,
            }}
          />
        </Source>

        {/* Tee markers — dark glass with gold border + glow */}
        {holes.map(h => {
          const tLat = parseNum(h.TeeLatitude)
          const tLng = parseNum(h.TeeLongitude)
          const n = holeNum(h)
          if (!tLat || !tLng) return null
          return (
            <Marker key={`tee-${n}`} latitude={tLat} longitude={tLng} anchor="center">
              <div
                title={`Hole ${n} — Par ${h.Par ?? '?'}${h.Yardage ? ' · ' + h.Yardage + ' yds' : ''}`}
                style={{
                  width: 30, height: 30,
                  background: 'linear-gradient(145deg, rgba(28,22,8,0.96) 0%, rgba(8,8,8,0.92) 100%)',
                  border: '1.5px solid #C9A84C',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 3px rgba(201,168,76,0.2), 0 6px 24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(201,168,76,0.15)',
                  cursor: 'default',
                }}
              >
                <span style={{
                  color: '#E8C96A',
                  fontSize: n > 9 ? 10 : 12,
                  fontWeight: 900,
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  lineHeight: 1,
                  letterSpacing: -0.5,
                  textShadow: '0 1px 4px rgba(201,168,76,0.6)',
                }}>{n}</span>
              </div>
            </Marker>
          )
        })}

        {/* Green markers — bright flag circle with glow */}
        {holes.map(h => {
          const gLat = parseNum(h.GreenLatitude)
          const gLng = parseNum(h.GreenLongitude)
          const n = holeNum(h)
          if (!gLat || !gLng) return null
          return (
            <Marker key={`green-${n}`} latitude={gLat} longitude={gLng} anchor="center">
              <div
                title={`Hole ${n} — Green`}
                style={{
                  width: 14, height: 14,
                  background: 'radial-gradient(circle at 35% 35%, #4ade80, #16a34a)',
                  border: '2px solid rgba(255,255,255,0.9)',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 3px rgba(34,197,94,0.3), 0 0 12px rgba(34,197,94,0.5), 0 3px 10px rgba(0,0,0,0.6)',
                  cursor: 'default',
                }}
              />
            </Marker>
          )
        })}
      </Map>

      {/* Vignette overlay — darkens edges for studio depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Top-left course name watermark */}
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

      {/* Bottom legend */}
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
            <div style={{
              width: 14, height: 14, borderRadius: 4,
              background: 'linear-gradient(145deg, rgba(28,22,8,0.96), rgba(8,8,8,0.92))',
              border: '1.5px solid #C9A84C',
              boxShadow: '0 0 0 2px rgba(201,168,76,0.2)',
            }} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: 600, fontFamily: '-apple-system, sans-serif' }}>
              Tee
            </span>
          </div>
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
          <div className="flex items-center gap-1.5">
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #4ade80, #16a34a)',
              border: '1.5px solid rgba(255,255,255,0.85)',
              boxShadow: '0 0 6px rgba(34,197,94,0.5)',
            }} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: 600, fontFamily: '-apple-system, sans-serif' }}>
              Green
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
