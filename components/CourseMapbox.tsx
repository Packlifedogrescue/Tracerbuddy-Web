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
  lat, lng, holes,
}: {
  lat: number
  lng: number
  holes: GolfHole[]
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
        { padding: { top: 48, bottom: 48, left: 48, right: 48 }, duration: 1200, maxZoom: 18 },
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

      {/* Fairway lines */}
      <Source id="fairways" type="geojson" data={fairways}>
        <Layer
          id="fairway-lines"
          type="line"
          paint={{
            'line-color': 'rgba(255,255,255,0.55)',
            'line-width': 2,
          }}
        />
      </Source>

      {/* Tee markers — dark glass pill with gold number */}
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
                width: 26, height: 26,
                background: 'rgba(8,8,8,0.85)',
                border: '1.5px solid #C9A84C',
                borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 18px rgba(0,0,0,0.7), 0 0 0 2.5px rgba(201,168,76,0.18)',
                cursor: 'default',
              }}
            >
              <span style={{
                color: '#C9A84C', fontSize: 11, fontWeight: 900,
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                lineHeight: 1, letterSpacing: -0.5,
              }}>{n}</span>
            </div>
          </Marker>
        )
      })}

      {/* Green markers — bright circle with glow ring */}
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
                width: 13, height: 13,
                background: '#22C55E',
                border: '2px solid rgba(255,255,255,0.95)',
                borderRadius: '50%',
                boxShadow: '0 2px 10px rgba(0,0,0,0.55), 0 0 0 4px rgba(34,197,94,0.22)',
                cursor: 'default',
              }}
            />
          </Marker>
        )
      })}
    </Map>
  )
}
