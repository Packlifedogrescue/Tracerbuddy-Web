import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.WEATHERAPI_KEY!

const CONDITION_ICON: Record<number, string> = {
  1000: '☀️', 1003: '⛅', 1006: '☁️', 1009: '☁️',
  1030: '🌫️', 1135: '🌫️', 1147: '🌫️',
  1063: '🌦️', 1150: '🌦️', 1153: '🌦️', 1180: '🌦️', 1240: '🌦️',
  1183: '🌧️', 1186: '🌧️', 1189: '🌧️', 1192: '🌧️', 1195: '🌧️',
  1243: '🌧️', 1246: '🌧️', 1168: '🌧️', 1171: '🌧️', 1198: '🌧️', 1201: '🌧️',
  1087: '⛈️', 1273: '⛈️', 1276: '⛈️', 1279: '⛈️', 1282: '⛈️',
  1066: '🌨️', 1210: '🌨️', 1213: '🌨️', 1216: '🌨️', 1219: '🌨️',
  1114: '❄️', 1117: '❄️', 1222: '❄️', 1225: '❄️', 1255: '❄️', 1258: '❄️',
  1069: '🌨️', 1072: '🌨️', 1204: '🌨️', 1207: '🌨️', 1237: '🌨️',
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lng}&days=1&aqi=no&alerts=no`
    const res  = await fetch(url, { next: { revalidate: 1800 } })
    const data = await res.json()

    const c    = data.current ?? {}
    const code = c.condition?.code ?? 1000
    const icon = CONDITION_ICON[code] ?? '🌡️'

    // Precipitation probability from first hourly forecast slot
    const hourly   = data.forecast?.forecastday?.[0]?.hour ?? []
    const nowHour  = new Date().getHours()
    const thisHour = hourly.find((h: any) => new Date(h.time).getHours() === nowHour)
    const precipProb = thisHour?.chance_of_rain ?? 0

    return NextResponse.json({
      temp:       Math.round(c.temp_f       ?? 0),
      feelsLike:  Math.round(c.feelslike_f  ?? 0),
      humidity:   Math.round(c.humidity     ?? 0),
      windSpeed:  Math.round(c.wind_mph     ?? 0),
      windDir:    c.wind_dir                ?? 'N',
      windDeg:    c.wind_degree             ?? 0,
      precipProb,
      uvIndex:    Math.round(c.uv           ?? 0),
      condition:  c.condition?.text         ?? 'Unknown',
      icon,
      code,
    })
  } catch {
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 })
  }
}
