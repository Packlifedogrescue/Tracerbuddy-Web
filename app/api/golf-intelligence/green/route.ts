import { NextRequest, NextResponse } from 'next/server'
import { giFetch } from '@/lib/golfIntelligence'

// Golf Intelligence green slope / elevation render — for the in-app "Try Golf Intelligence"
// screen. GI returns JSON with a signed CloudFront `imageUrl` (a PNG of the green's slope or
// elevation contours) plus metadata (dimensions, heading, green coordinate, par/yardage). We pass
// it straight through and let the client load the image URL directly (the URL is self-signed, so
// no auth is needed to fetch it). Cached briefly at the edge so paging through holes doesn't spend
// a GI credit per view; the signed URL stays valid well beyond the cache window.
//
//   GET /api/golf-intelligence/green?holeId=<id>&type=slope|elevation

export async function GET(req: NextRequest) {
  const holeId = req.nextUrl.searchParams.get('holeId') ?? ''
  const type = (req.nextUrl.searchParams.get('type') ?? 'slope').toLowerCase()
  if (!holeId) return NextResponse.json({ error: 'Missing holeId' }, { status: 400 })

  const endpoint = type === 'elevation' ? 'getElevationImage' : 'getSlopeImage'

  let res: Response
  try {
    res = await giFetch(`/greens/${endpoint}?holeId=${encodeURIComponent(holeId)}`)
  } catch (e: any) {
    return NextResponse.json({ error: 'Golf Intelligence auth error', detail: String(e?.message ?? e) }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Golf Intelligence API error', status: res.status }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, max-age=3600' },
  })
}
