import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.golfapi.io/api/v2.7'
const KEY  = process.env.GOLF_API_KEY!

export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } },
) {
  try {
    const res  = await fetch(`${BASE}/courses/${params.courseId}?apikey=${KEY}`, {
      next: { revalidate: 86400 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 502 })
  }
}
