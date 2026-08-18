import { NextRequest, NextResponse } from 'next/server'

// GET /api/golf/raw-coordinates?id=COURSE_ID
//
// This returned GolfAPI.io's raw POI coordinate list so the iOS app could
// compute true green centers. We've moved off GolfAPI.io (cost), and the new
// scorecard provider (golfcourseapi.com) has no coordinates. GPS will be
// reintroduced via the OpenStreetMap / Overpass layer (phase 2); until then
// this returns an empty coordinate set so the app degrades gracefully to
// no-GPS rather than erroring.
export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('id') ?? req.nextUrl.searchParams.get('courseId') ?? ''
  if (!courseId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  return NextResponse.json({
    courseID:       courseId,
    numCoordinates: 0,
    coordinates:    [],
    source:         'none',   // will become 'osm' once the Overpass layer ships
  })
}
