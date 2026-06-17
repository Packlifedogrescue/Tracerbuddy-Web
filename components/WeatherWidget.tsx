'use client'
import { useEffect, useState } from 'react'
import { Wind, Droplets, Sun, Thermometer, Loader2 } from 'lucide-react'

interface Weather {
  temp:       number
  feelsLike:  number
  humidity:   number
  windSpeed:  number
  windDir:    string
  windDeg:    number
  precipProb: number
  uvIndex:    number
  condition:  string
  icon:       string
}

function WindArrow({ deg }: { deg: number }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14"
      style={{ transform: `rotate(${deg}deg)`, display: 'inline-block' }}
    >
      <path d="M7 1 L10 10 L7 8.5 L4 10 Z" fill="#C9A84C" />
    </svg>
  )
}

function uvLabel(uv: number) {
  if (uv <= 2)  return { label: 'Low',       color: '#22A06B' }
  if (uv <= 5)  return { label: 'Moderate',  color: '#C9A84C' }
  if (uv <= 7)  return { label: 'High',      color: '#F97316' }
  if (uv <= 10) return { label: 'Very High', color: '#EF4444' }
  return               { label: 'Extreme',   color: '#9333EA' }
}

export default function WeatherWidget({ lat, lng, courseName }: {
  lat:        number
  lng:        number
  courseName?: string
}) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(true) } else { setWeather(d) }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [lat, lng])

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-5 h-5 text-[#C9A84C] animate-spin" />
    </div>
  )

  if (error || !weather) return (
    <div className="py-4 text-center text-[12px] text-gray-400">
      Weather unavailable
    </div>
  )

  const uv = uvLabel(weather.uvIndex)

  return (
    <div>
      {/* Main temp + condition */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-end gap-1.5">
            <span className="text-[42px] font-black text-[#111] leading-none">
              {weather.temp}°
            </span>
            <span className="text-[22px] pb-1 leading-none">{weather.icon}</span>
          </div>
          <div className="text-[12px] text-gray-500 mt-0.5">{weather.condition}</div>
          <div className="text-[11px] text-gray-400">Feels like {weather.feelsLike}°F</div>
        </div>

        {/* Golf playability score */}
        <div className="text-right">
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
            weather.precipProb < 20 && weather.windSpeed < 15 ? 'text-[#22A06B]'
            : weather.precipProb < 50 && weather.windSpeed < 25 ? 'text-[#C9A84C]'
            : 'text-red-400'
          }`}>
            {weather.precipProb < 20 && weather.windSpeed < 15 ? 'Great Day' :
             weather.precipProb < 50 && weather.windSpeed < 25 ? 'Playable'  : 'Tough Conditions'}
          </div>
          <div className="text-[10px] text-gray-400">for golf</div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#F8F4EE] rounded-xl p-3 flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
          <div>
            <div className="text-[13px] font-bold text-[#111] flex items-center gap-1">
              {weather.windSpeed} mph
              <WindArrow deg={weather.windDeg} />
            </div>
            <div className="text-[10px] text-gray-400">{weather.windDir} wind</div>
          </div>
        </div>

        <div className="bg-[#F8F4EE] rounded-xl p-3 flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
          <div>
            <div className="text-[13px] font-bold text-[#111]">{weather.precipProb}%</div>
            <div className="text-[10px] text-gray-400">Rain chance</div>
          </div>
        </div>

        <div className="bg-[#F8F4EE] rounded-xl p-3 flex items-center gap-2">
          <Sun className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
          <div>
            <div className="text-[13px] font-bold" style={{ color: uv.color }}>
              {weather.uvIndex} — {uv.label}
            </div>
            <div className="text-[10px] text-gray-400">UV index</div>
          </div>
        </div>

        <div className="bg-[#F8F4EE] rounded-xl p-3 flex items-center gap-2">
          <Thermometer className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
          <div>
            <div className="text-[13px] font-bold text-[#111]">{weather.humidity}%</div>
            <div className="text-[10px] text-gray-400">Humidity</div>
          </div>
        </div>
      </div>

      {courseName && (
        <div className="mt-2.5 text-[10.5px] text-gray-400 text-center">
          Conditions at {courseName}
        </div>
      )}

      <div className="mt-2 text-center">
        <a
          href="https://weatherkit.apple.com/legal-attribution.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9.5px] text-gray-400 hover:text-gray-500 transition-colors"
        >
          🍎 Weather
        </a>
      </div>
    </div>
  )
}
