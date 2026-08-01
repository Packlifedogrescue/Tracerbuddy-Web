import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { giFetch } from '@/lib/golfIntelligence'

// Golf Intelligence course detail + GPS, normalized to { courseName, holes, coords }.
// Cache-first in the SAME cached_courses table as the GolfAPI route, keyed "gi:<PublicId>"
// so the two providers never collide and no migration is needed. Each unique course is one
// GI call, cached permanently after — the mechanism that protects the free-call allowance.

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const publicId = req.nextUrl.searchParams.get('id') ?? ''
  if (!publicId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = sb()
  const cacheKey = `gi:${publicId}`

  // Permanent cache — course geometry doesn't change.
  const { data: cached } = await db
    .from('cached_courses')
    .select('course_name, holes_json, coords_json')
    .eq('course_id', cacheKey)
    .maybeSingle()

  if (cached?.holes_json) {
    return NextResponse.json({
      courseName: cached.course_name,
      holes:      cached.holes_json,   // GI ScoringCourseGroupDto
      coords:     cached.coords_json,  // GI LayoutCourseGroupDto
    })
  }

  let detailRes: Response, gpsRes: Response
  try {
    [detailRes, gpsRes] = await Promise.all([
      giFetch(`/courses/getCourseGroupDetail?PublicId=${encodeURIComponent(publicId)}`),
      giFetch(`/courses/getCourseGroupGPS?PublicId=${encodeURIComponent(publicId)}`),
    ])
  } catch (e: any) {
    return NextResponse.json({ error: 'Golf Intelligence auth error', detail: String(e?.message ?? e) }, { status: 502 })
  }

  if (!detailRes.ok) {
    return NextResponse.json({ error: 'Golf Intelligence API error', status: detailRes.status }, { status: 502 })
  }

  const detail = await detailRes.json()
  const coords = gpsRes.ok ? await gpsRes.json() : null
  const courseName: string = detail?.name ?? detail?.courseName ?? detail?.facilityName ?? ''

  await db.from('cached_courses').upsert({
    course_id:   cacheKey,
    course_name: courseName,
    holes_json:  detail,
    coords_json: coords,
    cached_at:   new Date().toISOString(),
  })

  return NextResponse.json({ courseName, holes: detail, coords })
}
