import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.golfapi.io/api/v2.7'
const KEY  = process.env.GOLF_API_KEY!

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ courses: [] })

  try {
    const res  = await fetch(`${BASE}/courses?search=${encodeURIComponent(q)}&apikey=${KEY}`, {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    // GolfAPI returns either { courses: [...] } or a bare array
    const courses = Array.isArray(data) ? data : (data.courses ?? [])
    return NextResponse.json({ courses })
  } catch {
    return NextResponse.json({ courses: [] }, { status: 502 })
  }
}
