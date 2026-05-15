import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.OPEN_METEO_API_KEY!

// WMO weather interpretation codes → label + emoji
const WMO: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Clear sky',        icon: '☀️' },
  1:  { label: 'Mainly clear',     icon: '🌤️' },
  2:  { label: 'Partly cloudy',    icon: '⛅' },
  3:  { label: 'Overcast',         icon: '☁️' },
  45: { label: 'Foggy',            icon: '🌫️' },
  48: { label: 'Icy fog',          icon: '🌫️' },
  51: { label: 'Light drizzle',    icon: '🌦️' },
  53: { label: 'Drizzle',          icon: '🌦️' },
  55: { label: 'Heavy drizzle',    icon: '🌧️' },
  61: { label: 'Light rain',       icon: '🌧️' },
  63: { label: 'Rain',             icon: '🌧️' },
  65: { label: 'Heavy rain',       icon: '🌧️' },
  71: { label: 'Light snow',       icon: '🌨️' },
  73: { label: 'Snow',             icon: '❄️' },
  75: { label: 'Heavy snow',       icon: '❄️' },
  80: { label: 'Rain showers',     icon: '🌦️' },
  81: { label: 'Showers',          icon: '🌧️' },
  82: { label: 'Violent showers',  icon: '⛈️' },
  95: { label: 'Thunderstorm',     icon: '⛈️' },
  96: { label: 'Thunderstorm',     icon: '⛈️' },
  99: { label: 'Thunderstorm',     icon: '⛈️' },
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  try {
    // Open-Meteo commercial endpoint (uses API key)
    const url = new URL('https://customer-api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude',  lat)
    url.searchParams.set('longitude', lng)
    url.searchParams.set('current',   [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'precipitation_probability',
      'relative_humidity_2m',
      'uv_index',
    ].join(','))
    url.searchParams.set('hourly',         'precipitation_probability')
    url.searchParams.set('forecast_days',  '1')
    url.searchParams.set('temperature_unit', 'fahrenheit')
    url.searchParams.set('wind_speed_unit',  'mph')
    url.searchParams.set('apikey', API_KEY)

    const res  = await fetch(url.toString(), { next: { revalidate: 1800 } })
    const data = await res.json()

    const c    = data.current ?? {}
    const code = c.weather_code ?? 0
    const wmo  = WMO[code] ?? { label: 'Unknown', icon: '🌡️' }

    // Wind direction as compass bearing
    const deg = c.wind_direction_10m ?? 0
    const dirs = ['N','NE','E','SE','S','SW','W','NW']
    const windDir = dirs[Math.round(deg / 45) % 8]

    return NextResponse.json({
      temp:        Math.round(c.temperature_2m      ?? 0),
      feelsLike:   Math.round(c.apparent_temperature ?? 0),
      humidity:    Math.round(c.relative_humidity_2m ?? 0),
      windSpeed:   Math.round(c.wind_speed_10m       ?? 0),
      windDir,
      windDeg:     deg,
      precipProb:  c.precipitation_probability       ?? 0,
      uvIndex:     Math.round(c.uv_index             ?? 0),
      condition:   wmo.label,
      icon:        wmo.icon,
      code,
    })
  } catch {
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 })
  }
}
