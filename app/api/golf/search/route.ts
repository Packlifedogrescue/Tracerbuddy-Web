import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE = 'https://api.golfapi.io/api/v2.7'
const GOLF_KEY  = process.env.GOLF_API_KEY!
const CACHE_TTL_DAYS = 7

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

function normalise(q: string) {
  return q.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q')?.trim()
  if (!raw) return NextResponse.json({ courses: [] })

  const key = normalise(raw)

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  try {
    const { data: cached } = await sb
      .from('golf_courses_cache')
      .select('results, cached_at')
      .eq('search_query', key)
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

  // ── 2. Call GolfAPI.io ───────────────────────────────────────────────────
  try {
    const res    = await fetch(
      `${GOLF_BASE}/courses?search=${encodeURIComponent(raw)}&apikey=${GOLF_KEY}`,
    )
    const data   = await res.json()
    const courses = Array.isArray(data) ? data : (data.courses ?? [])

    // ── 3. Write to cache (best-effort) ──────────────────────────────────
    try {
      await sb.from('golf_courses_cache').upsert({
        search_query: key,
        results:      courses,
        cached_at:    new Date().toISOString(),
      })
    } catch { /* ignore cache write failure */ }

    return NextResponse.json({ courses })
  } catch {
    return NextResponse.json({ courses: [] }, { status: 502 })
  }
}
