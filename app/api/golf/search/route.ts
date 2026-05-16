import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE     = 'https://api.golfapi.io/api/v2.7'
const CACHE_TTL_DAYS = 7

function normalise(q: string) {
  return q.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const state = req.nextUrl.searchParams.get('state')?.trim() ?? ''
  const city  = req.nextUrl.searchParams.get('city')?.trim() ?? ''

  // Need at least a query or a state to search
  if (!raw && !state) return NextResponse.json({ courses: [] })

  const cacheKey = normalise([raw, state, city].filter(Boolean).join('|'))
  const GOLF_KEY = process.env.GOLF_API_KEY!
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  try {
    const { data: cached } = await sb
      .from('golf_courses_cache')
      .select('results, cached_at')
      .eq('search_query', cacheKey)
      .maybeSingle()

    if (cached) {
      const age = (Date.now() - new Date(cached.cached_at).getTime()) / 86_400_000
      if (age < CACHE_TTL_DAYS) {
        return NextResponse.json({ courses: cached.results, cached: true })
      }
    }
  } catch {
    // Cache table may not exist yet — fall through to live API
  }

  // ── 2. Build GolfAPI URL ─────────────────────────────────────────────────
  try {
    const params = new URLSearchParams({ apikey: GOLF_KEY })
    if (raw)   params.set('search', raw)
    if (state) params.set('state', state)
    if (city)  params.set('city', city)

    const res     = await fetch(`${GOLF_BASE}/courses?${params.toString()}`)
    const data    = await res.json()
    let courses   = Array.isArray(data) ? data : (data.courses ?? [])

    // Client-side filter by state if API doesn't filter natively
    if (state && courses.length > 0) {
      const stateUp = state.toUpperCase()
      const filtered = courses.filter((c: any) =>
        c.StateCode?.toUpperCase() === stateUp ||
        c.State?.toUpperCase()     === stateUp ||
        c.state?.toUpperCase()     === stateUp
      )
      // Only apply filter if it returns results (some APIs ignore the param)
      if (filtered.length > 0) courses = filtered
    }

    // ── 3. Write to cache (best-effort) ──────────────────────────────────
    try {
      await sb.from('golf_courses_cache').upsert({
        search_query: cacheKey,
        results:      courses,
        cached_at:    new Date().toISOString(),
      })
    } catch { /* ignore cache write failure */ }

    return NextResponse.json({ courses })
  } catch {
    return NextResponse.json({ courses: [] }, { status: 502 })
  }
}
