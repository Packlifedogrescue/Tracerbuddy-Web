import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('id') ?? ''
  if (!courseId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = sb()

  // Cache check — course data never changes, so no TTL
  const { data: cached } = await db
    .from('cached_courses')
    .select('course_name, holes_json, coords_json')
    .eq('course_id', courseId)
    .maybeSingle()

  if (cached?.holes_json) {
    return NextResponse.json({
      courseName: cached.course_name,
      holes:      cached.holes_json,
      coords:     cached.coords_json,
    })
  }

  // Call Golf API for both endpoints in parallel
  const apiBase = process.env.GOLF_API_BASE_URL!
  const apiKey  = process.env.GOLF_API_KEY!

  const [holesRes, coordsRes] = await Promise.all([
    fetch(`${apiBase}/courses/${courseId}?key=${apiKey}`, { next: { revalidate: 0 } }),
    fetch(`${apiBase}/coordinates/${courseId}?key=${apiKey}`, { next: { revalidate: 0 } }),
  ])

  if (!holesRes.ok) {
    return NextResponse.json({ error: 'Golf API error', status: holesRes.status }, { status: 502 })
  }

  const holesData  = await holesRes.json()
  const coordsData = coordsRes.ok ? await coordsRes.json() : null

  const courseName: string = holesData?.name ?? holesData?.courseName ?? ''

  // Persist — permanent cache, no TTL
  await db.from('cached_courses').upsert({
    course_id:   courseId,
    course_name: courseName,
    holes_json:  holesData,
    coords_json: coordsData,
    cached_at:   new Date().toISOString(),
  })

  return NextResponse.json({
    courseName,
    holes:  holesData,
    coords: coordsData,
  })
}
