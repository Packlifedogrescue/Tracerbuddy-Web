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
          className="inline-flex items-center gap-1 text-[9.5px] text-gray-400 hover:text-gray-500 transition-colors"
        >
          <svg width="9" height="11" viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.59 0-9.5 1.05-14.75 3.17-5.262 2.13-9.501 3.24-12.741 3.35-4.93.21-9.842-1.96-14.74-6.52-3.13-2.73-7.045-7.41-11.735-14.04-5.032-7.08-9.169-15.29-12.41-24.65-3.471-10.11-5.211-19.9-5.211-29.378 0-10.857 2.346-20.221 7.045-28.068 3.693-6.303 8.606-11.275 14.755-14.925 6.149-3.65 12.792-5.51 19.936-5.629 3.915 0 9.049 1.211 15.429 3.591 6.362 2.388 10.447 3.599 12.238 3.599 1.339 0 5.877-1.416 13.534-4.239 7.227-2.618 13.327-3.702 18.317-3.275 13.539 1.094 23.722 6.434 30.514 16.05-12.108 7.336-18.099 17.612-17.978 30.78.11 10.262 3.866 18.804 11.252 25.598 3.348 3.179 7.094 5.65 11.252 7.42-.9 2.61-1.85 5.11-2.85 7.51zm-31.011-118.78c0 8.097-2.96 15.658-8.86 22.658-7.119 8.32-15.74 13.13-25.09 12.36-.12-.99-.19-2.03-.19-3.12 0-7.77 3.38-16.08 9.39-22.85 3-3.42 6.82-6.26 11.45-8.52 4.62-2.23 8.99-3.46 13.1-3.67.12 1.06.2 2.12.2 3.14z"/>
          </svg>
          Weather
        </a>
      </div>
    </div>
  )
}
