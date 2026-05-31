import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  // Cache check
  const cutoff = new Date(Date.now() - SEARCH_TTL_DAYS * 86400000).toISOString()
  const { data: cached } = await db
    .from('cached_searches')
    .select('results_json')
    .eq('query', query)
    .gte('cached_at', cutoff)
    .maybeSingle()

  if (cached?.results_json) {
    return NextResponse.json(cached.results_json)
  }

  // Call Golf API
  const apiBase = process.env.GOLF_API_BASE_URL!
  const apiKey  = process.env.GOLF_API_KEY!
  const encoded = encodeURIComponent(raw.trim())

  const res = await fetch(`${apiBase}/courses?name=${encoded}&key=${apiKey}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Golf API error', status: res.status }, { status: 502 })
  }

  const data = await res.json()

  // Store in Supabase (upsert so repeated misses don't error)
  if (Array.isArray(data) && data.length > 0) {
    await db.from('cached_searches').upsert({
      query,
      results_json: data,
      cached_at: new Date().toISOString(),
    })
  }

  return NextResponse.json(data)
}
