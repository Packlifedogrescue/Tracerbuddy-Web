'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface Shot {
  hit_lat: number; hit_lng: number
  land_lat: number; land_lng: number
  club: string; yards: number; hole: number
}

export default function ShotMap({ shots }: { shots: Shot[] }) {
  // Find center of all shots
  const lats = shots.flatMap(s => [s.hit_lat, s.land_lat]).filter(Boolean)
  const lngs = shots.flatMap(s => [s.hit_lng, s.land_lng]).filter(Boolean)
  const center: [number, number] = lats.length
    ? [lats.reduce((a,b) => a+b)/lats.length, lngs.reduce((a,b) => a+b)/lngs.length]
    : [40.0, -77.0]

  const GOLD = '#FFD700'

  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 320 }}>
      <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri"
        />
        {shots.map((shot, i) => {
          if (!shot.hit_lat || !shot.land_lat) return null
          return (
            <div key={i}>
              {/* Shot line */}
              <Polyline
                positions={[[shot.hit_lat, shot.hit_lng],[shot.land_lat, shot.land_lng]]}
                color={GOLD} weight={2.5} opacity={0.85}
              />
              {/* Landing dot */}
              <CircleMarker
                center={[shot.land_lat, shot.land_lng]}
                radius={5} color={GOLD} fillColor={GOLD} fillOpacity={1} weight={0}
              />
            </div>
          )
        })}
      </MapContainer>
    </div>
  )
}
