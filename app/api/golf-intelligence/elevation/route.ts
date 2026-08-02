import { NextRequest, NextResponse } from 'next/server'
import { giFetch } from '@/lib/golfIntelligence'

// Golf Intelligence hole terrain-elevation mesh (getGeoHashElevation) — for the "Try Golf
// Intelligence" screen's plays-like elevation. GI returns a dense grid of altitude points across
// the hole: { cellCount, geoHashCells: [{ gpsCoordinate: { altitude, latitude, longitude }, geoHash }] }.
// The client picks the cells nearest the tee and green to derive the tee→green elevation change.
// Terrain is static, so this is cached a day at the edge (a lookup per hole, not per credit-view).
//
//   GET /api/golf-intelligence/elevation?holeId=<id>

export async function GET(req: NextRequest) {
  const holeId = req.nextUrl.searchParams.get('holeId') ?? ''
  if (!holeId) return NextResponse.json({ error: 'Missing holeId' }, { status: 400 })

  let res: Response
  try {
    res = await giFetch(`/holeProfile/getGeoHashElevation?holeId=${encodeURIComponent(holeId)}`)
  } catch (e: any) {
    return NextResponse.json({ error: 'Golf Intelligence auth error', detail: String(e?.message ?? e) }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Golf Intelligence API error', status: res.status }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, max-age=86400' },
  })
}
