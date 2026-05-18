'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import Map, { Source, Layer, Marker, Popup, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Shot {
  id?: string
  hit_lat: number; hit_lng: number
  land_lat: number; land_lng: number
  club: string; yards: number; hole: number
}

// Arc between two GPS points — samples a bezier with a raised midpoint for visual arc
function arcGeoJSON(shots: Shot[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = shots.map((s, idx) => {
    const pts: [number, number][] = []
    const steps = 24
    // Control point raised slightly toward the sky (offset midpoint)
    const midLat = (s.hit_lat + s.land_lat) / 2
    const midLng = (s.hit_lng + s.land_lng) / 2
    const dx = s.land_lng - s.hit_lng
    const dy = s.land_lat - s.hit_lat
    const dist = Math.sqrt(dx * dx + dy * dy)
    const lift = dist * 0.35
    // Perpendicular offset to create arc
    const cpLat = midLat - dy * lift * 0.5
    const cpLng = midLng + dx * lift * 0.5

    for (let i = 0; i <= steps; i++) {
      const t  = i / steps
      const t1 = 1 - t
      const lat = t1 * t1 * s.hit_lat + 2 * t1 * t * cpLat + t * t * s.land_lat
      const lng = t1 * t1 * s.hit_lng + 2 * t1 * t * cpLng + t * t * s.land_lng
      pts.push([lng, lat])
    }
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: pts },
      properties: { idx, hole: s.hole, club: s.club, yards: s.yards },
    }
  })
  return { type: 'FeatureCollection', features }
}

function hitsGeoJSON(shots: Shot[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: shots.map((s, idx) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.hit_lng, s.hit_lat] },
      properties: { idx, hole: s.hole, club: s.club, yards: s.yards, type: 'hit' },
    })),
  }
}

function landsGeoJSON(shots: Shot[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: shots.map((s, idx) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.land_lng, s.land_lat] },
      properties: { idx, hole: s.hole, club: s.club, yards: s.yards, type: 'land' },
    })),
  }
}

const CLUB_COLORS: Record<string, string> = {
  driver: '#FF4D4D', '1w': '#FF4D4D',
  '3w': '#FF8C00', '5w': '#FF8C00', '7w': '#FF8C00',
  '2h': '#FFD700', '3h': '#FFD700', '4h': '#FFD700', '5h': '#FFD700',
  '1i': '#60A5FA', '2i': '#60A5FA', '3i': '#60A5FA', '4i': '#60A5FA',
  '5i': '#34D399', '6i': '#34D399', '7i': '#34D399',
  '8i': '#A78BFA', '9i': '#A78BFA',
  'pw': '#F472B6', 'gw': '#F472B6', 'sw': '#F472B6', 'lw': '#F472B6',
  'putter': '#94A3B8',
}

function clubColor(club: string): string {
  if (!club) return '#C9A84C'
  const k = club.toLowerCase().replace(/\s+/g, '')
  return CLUB_COLORS[k] ?? '#C9A84C'
}

const SF = { fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }

export default function ShotMap({ shots }: { shots: Shot[] }) {
  const mapRef       = useRef<MapRef>(null)
  const [loaded,     setLoaded]     = useState(false)
  const [activeHole, setActiveHole] = useState<number | 'all'>('all')
  const [popup,      setPopup]      = useState<{ shot: Shot; x: number; y: number } | null>(null)
  const [osmData,    setOsmData]    = useState<GeoJSON.FeatureCollection | null>(null)

  const holes = Array.from(new Set(shots.map(s => s.hole))).sort((a, b) => a - b)

  const visible = activeHole === 'all' ? shots : shots.filter(s => s.hole === activeHole)

  // Calculate center
  const lats = shots.flatMap(s => [s.hit_lat, s.land_lat]).filter(Boolean)
  const lngs = shots.flatMap(s => [s.hit_lng, s.land_lng]).filter(Boolean)
  const centerLat = lats.length ? lats.reduce((a, b) => a + b) / lats.length : 40.0
  const centerLng = lngs.length ? lngs.reduce((a, b) => a + b) / lngs.length : -77.0

  const onLoad = useCallback(() => {
    setLoaded(true)
    const map = mapRef.current?.getMap() as any
    if (!map) return
    try {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512, maxzoom: 14,
      })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
    } catch (_) {}

    // Fit all shots
    if (lats.length >= 2) {
      mapRef.current?.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, duration: 800, maxZoom: 18 }
      )
    }

    // Fetch OSM golf polygons
    fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `[out:json][timeout:25];(way["golf"~"fairway|green|bunker|water_hazard|rough|tee"](around:1500,${centerLat},${centerLng}););(._;>;);out body;`,
    })
      .then(r => r.json())
      .then(d => {
        const nodeMap: Record<number, [number, number]> = {}
        d.elements.forEach((el: any) => {
          if (el.type === 'node') nodeMap[el.id] = [el.lon, el.lat]
        })
        const features: GeoJSON.Feature[] = []
        d.elements.forEach((el: any) => {
          if (el.type !== 'way' || !el.nodes || !el.tags) return
          const coords = el.nodes.map((n: number) => nodeMap[n]).filter(Boolean)
          if (coords.length < 3) return
          const ring = coords[0][0] !== coords[coords.length - 1][0]
            ? [...coords, coords[0]] : coords
          features.push({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [ring] },
            properties: { golf: el.tags.golf ?? '' },
          })
        })
        setOsmData({ type: 'FeatureCollection', features })
      })
      .catch(() => {})
  }, [])

  // Fly to hole shots when activeHole changes
  useEffect(() => {
    if (!loaded || !mapRef.current) return
    const pts = visible.flatMap(s => [[s.hit_lng, s.hit_lat], [s.land_lng, s.land_lat]]) as [number, number][]
    if (pts.length < 2) return
    const lngsV = pts.map(p => p[0])
    const latsV = pts.map(p => p[1])
    mapRef.current.fitBounds(
      [[Math.min(...lngsV), Math.min(...latsV)], [Math.max(...lngsV), Math.max(...latsV)]],
      { padding: 80, duration: 900, maxZoom: 18 }
    )
  }, [activeHole, loaded])

  const arcData   = arcGeoJSON(visible)
  const hitData   = hitsGeoJSON(visible)
  const landData  = landsGeoJSON(visible)

  // Build per-club color expression for line-color
  const clubColorExpr = ['match', ['get', 'club'],
    ...Object.entries(CLUB_COLORS).flat(),
    '#C9A84C',
  ] as unknown as string

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ height: 420 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ latitude: centerLat, longitude: centerLng, zoom: 15, pitch: 30 }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onLoad={onLoad}
        onClick={() => setPopup(null)}
      >
        {/* OSM Golf Overlays */}
        {osmData && (
          <Source id="osm-golf" type="geojson" data={osmData}>
            <Layer id="osm-rough"   type="fill" filter={['==', ['get', 'golf'], 'rough']}        paint={{ 'fill-color': 'rgba(30,110,50,0.22)',   'fill-outline-color': 'rgba(30,110,50,0.4)'   }} />
            <Layer id="osm-fairway" type="fill" filter={['==', ['get', 'golf'], 'fairway']}      paint={{ 'fill-color': 'rgba(34,197,94,0.3)',    'fill-outline-color': 'rgba(34,197,94,0.5)'   }} />
            <Layer id="osm-tee"     type="fill" filter={['==', ['get', 'golf'], 'tee']}          paint={{ 'fill-color': 'rgba(148,163,184,0.35)', 'fill-outline-color': 'rgba(148,163,184,0.55)'}} />
            <Layer id="osm-bunker"  type="fill" filter={['==', ['get', 'golf'], 'bunker']}       paint={{ 'fill-color': 'rgba(251,211,141,0.6)',  'fill-outline-color': 'rgba(234,179,8,0.7)'   }} />
            <Layer id="osm-water"   type="fill" filter={['==', ['get', 'golf'], 'water_hazard']} paint={{ 'fill-color': 'rgba(56,130,246,0.5)',   'fill-outline-color': 'rgba(56,130,246,0.75)' }} />
            <Layer id="osm-green"   type="fill" filter={['==', ['get', 'golf'], 'green']}        paint={{ 'fill-color': 'rgba(74,222,128,0.45)',  'fill-outline-color': 'rgba(74,222,128,0.8)'  }} />
          </Source>
        )}

        {/* Shot arc glow */}
        <Source id="arcs-glow" type="geojson" data={arcData}>
          <Layer id="arc-glow" type="line"
            paint={{ 'line-color': '#fff', 'line-width': 8, 'line-blur': 6, 'line-opacity': 0.15 }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </Source>

        {/* Shot arc lines — colored by club */}
        <Source id="arcs" type="geojson" data={arcData}>
          <Layer id="arc-lines" type="line"
            paint={{
              'line-color': clubColorExpr,
              'line-width': 2.5,
              'line-opacity': 0.92,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </Source>

        {/* Hit points (where club struck) */}
        <Source id="hits" type="geojson" data={hitData}>
          <Layer id="hit-dots" type="circle"
            paint={{
              'circle-color': '#fff',
              'circle-radius': 4,
              'circle-stroke-width': 2,
              'circle-stroke-color': clubColorExpr,
              'circle-opacity': 0.95,
            }}
          />
        </Source>

        {/* Landing points */}
        <Source id="lands" type="geojson" data={landData}>
          <Layer id="land-dots" type="circle"
            paint={{
              'circle-color': clubColorExpr,
              'circle-radius': 5,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
              'circle-opacity': 1,
            }}
          />
        </Source>

        {/* Shot number labels */}
        {visible.map((s, i) => (
          s.hit_lat && s.hit_lng ? (
            <Marker key={`num-${i}`} latitude={s.hit_lat} longitude={s.hit_lng} anchor="center">
              <button
                onClick={e => { e.stopPropagation(); setPopup({ shot: s, x: e.clientX, y: e.clientY }) }}
                style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: clubColor(s.club),
                  border: '2px solid rgba(255,255,255,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ ...SF, color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>
                  {i + 1}
                </span>
              </button>
            </Marker>
          ) : null
        ))}

        {/* Popup */}
        {popup && (
          <Popup
            latitude={popup.shot.hit_lat}
            longitude={popup.shot.hit_lng}
            onClose={() => setPopup(null)}
            closeButton={false}
            offset={20}
          >
            <div style={{ ...SF, background: 'rgba(0,0,0,0.85)', borderRadius: 10, padding: '8px 12px', minWidth: 110 }}>
              <div style={{ color: clubColor(popup.shot.club), fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {popup.shot.club || 'Club'}
              </div>
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
                {popup.shot.yards} <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>yds</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>Hole {popup.shot.hole}</div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.35) 100%)' }} />

      {/* Hole filter chips */}
      {holes.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none rounded-b-2xl"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', paddingBottom: 10, paddingTop: 24 }}>
          <div className="pointer-events-auto overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div style={{ display: 'flex', gap: 5, paddingLeft: 10, paddingRight: 10, width: 'max-content' }}>
              {/* "All" chip */}
              <button
                onClick={() => setActiveHole('all')}
                style={{
                  ...SF,
                  height: 30, padding: '0 10px', borderRadius: 8,
                  background: activeHole === 'all' ? '#C9A84C' : 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(8px)',
                  border: `1.5px solid ${activeHole === 'all' ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  color: activeHole === 'all' ? '#1a0f00' : '#fff',
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  transform: activeHole === 'all' ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                All
              </button>
              {holes.map(h => (
                <button
                  key={h}
                  onClick={() => setActiveHole(h)}
                  style={{
                    ...SF,
                    width: 34, height: 30, borderRadius: 8,
                    background: activeHole === h ? '#C9A84C' : 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(8px)',
                    border: `1.5px solid ${activeHole === h ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: activeHole === h ? '#1a0f00' : '#fff',
                    fontSize: 11, fontWeight: 800, cursor: 'pointer',
                    transform: activeHole === h ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Club color legend */}
      <div className="absolute top-3 right-3 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px' }}>
        {[
          { label: 'Driver/Wood', color: '#FF4D4D' },
          { label: 'Hybrid',      color: '#FFD700' },
          { label: 'Long Iron',   color: '#60A5FA' },
          { label: 'Mid Iron',    color: '#34D399' },
          { label: 'Short Iron',  color: '#A78BFA' },
          { label: 'Wedge',       color: '#F472B6' },
          { label: 'Putter',      color: '#94A3B8' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 mb-1 last:mb-0">
            <div style={{ width: 20, height: 2.5, borderRadius: 2, background: color }} />
            <span style={{ ...SF, color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Shot count badge */}
      <div className="absolute top-3 left-3"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '5px 10px' }}>
        <span style={{ ...SF, color: '#C9A84C', fontSize: 11, fontWeight: 800 }}>
          {visible.length} shot{visible.length !== 1 ? 's' : ''}
          {activeHole !== 'all' ? ` · Hole ${activeHole}` : ''}
        </span>
      </div>
    </div>
  )
}
