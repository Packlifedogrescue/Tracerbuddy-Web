import { NextRequest, NextResponse } from 'next/server'
import { createSign } from 'crypto'

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function makeWeatherKitToken(): string {
  const keyId      = process.env.APPLE_MAPS_KEY_ID   ?? ''
  const teamId     = process.env.APPLE_MAPS_TEAM_ID  ?? ''
  const privateKey = (process.env.APPLE_MAPS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  const bundleId   = process.env.APPLE_BUNDLE_ID     ?? 'com.brettmiller.TracerBuddy'

  const now    = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, id: `${teamId}.${bundleId}`, typ: 'JWT' }))
  const payload = base64url(JSON.stringify({ iss: teamId, iat: now, exp: now + 3600, sub: bundleId }))
  const data   = `${header}.${payload}`

  const signer = createSign('SHA256')
  signer.update(data)
  const sig = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
  return `${data}.${base64url(sig)}`
}

function degToCardinal(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

function conditionIcon(code: string): string {
  if (!code) return '🌡️'
  const c = code.toLowerCase()
  if (c.includes('clear') || c === 'hot')              return '☀️'
  if (c.includes('mostlyclear'))                        return '🌤️'
  if (c.includes('partlycloudy'))                       return '⛅'
  if (c.includes('mostlycloudy'))                       return '🌥️'
  if (c.includes('cloudy'))                             return '☁️'
  if (c.includes('thunder') || c.includes('storm'))     return '⛈️'
  if (c.includes('heavyrain') || c.includes('rain'))    return '🌧️'
  if (c.includes('drizzle'))                            return '🌦️'
  if (c.includes('snow') || c.includes('blizzard'))     return '🌨️'
  if (c.includes('sleet') || c.includes('freezing') || c.includes('hail')) return '🌨️'
  if (c.includes('fog') || c.includes('haze') || c.includes('smoke') || c.includes('dust')) return '🌫️'
  if (c.includes('wind') || c.includes('bluster'))      return '💨'
  if (c.includes('tornado') || c.includes('hurricane')) return '🌀'
  return '🌡️'
}

function conditionLabel(code: string): string {
  if (!code) return 'Unknown'
  return code.replace(/([A-Z])/g, ' $1').trim()
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  try {
    const token = makeWeatherKitToken()
    const url   = `https://weatherkit.apple.com/api/v1/weather/en/${lat}/${lng}?dataSets=currentWeather,forecastNextHour&timezone=UTC`

    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next:    { revalidate: 1800 },
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('WeatherKit error', res.status, txt)
      return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 })
    }

    const data = await res.json()
    const c    = data.currentWeather ?? {}

    // Temperature: Celsius → Fahrenheit
    const toF = (celsius: number) => Math.round(celsius * 9 / 5 + 32)
    // Wind: km/h → mph
    const toMph = (kmh: number) => Math.round(kmh * 0.621371)

    const precipProb = Math.round(
      ((data.forecastNextHour?.minutes ?? []).slice(0, 12)
        .reduce((sum: number, m: any) => sum + (m.precipitationChance ?? 0), 0) / 12) * 100
    )

    return NextResponse.json({
      temp:       toF(c.temperature       ?? 0),
      feelsLike:  toF(c.temperatureApparent ?? 0),
      humidity:   Math.round((c.humidity   ?? 0) * 100),
      windSpeed:  toMph(c.windSpeed        ?? 0),
      windDir:    degToCardinal(c.windDirection ?? 0),
      windDeg:    c.windDirection          ?? 0,
      precipProb: Math.max(0, Math.min(100, precipProb)),
      uvIndex:    Math.round(c.uvIndex     ?? 0),
      condition:  conditionLabel(c.conditionCode ?? ''),
      icon:       conditionIcon(c.conditionCode  ?? ''),
    })
  } catch (e: any) {
    console.error('WeatherKit fetch failed', e)
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 })
  }
}
