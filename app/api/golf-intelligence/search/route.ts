import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { giFetch } from '@/lib/golfIntelligence'

// Golf Intelligence course search. Cache-first in the same cached_searches table as the
// GolfAPI route, keyed "gi:<query>" so providers never collide (no migration needed).

const SEARCH_TTL_DAYS = 7

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q') ?? ''
  const query = raw.trim().toLowerCase()
  if (!query) return NextResponse.json([], { status: 200 })

  const db = sb()
  const cacheKey = `gi:${query}`

  const cutoff = new Date(Date.now() - SEARCH_TTL_DAYS * 86400000).toISOString()
  const { data: cached } = await db
    .from('cached_searches')
    .select('results_json')
    .eq('query', cacheKey)
    .gte('cached_at', cutoff)
    .maybeSingle()

  if (cached?.results_json) return NextResponse.json(cached.results_json)

  let res: Response
  try {
    res = await giFetch(`/courses/searchCourseGroups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: raw.trim(), rows: 20, offset: 0 }),
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Golf Intelligence auth error', detail: String(e?.message ?? e) }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Golf Intelligence API error', status: res.status }, { status: 502 })
  }

  const data = await res.json()

  await db.from('cached_searches').upsert({
    query:        cacheKey,
    results_json: data,
    cached_at:    new Date().toISOString(),
  })

  return NextResponse.json(data)
}
