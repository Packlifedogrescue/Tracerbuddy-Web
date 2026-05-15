import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOLF_BASE = 'https://api.golfapi.io/api/v2.7'
const GOLF_KEY  = process.env.GOLF_API_KEY!
const CACHE_TTL_DAYS = 30   // Course layouts barely change

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL      ?? 'https://mmwxbpqviqtitxptfiog.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1td3hicHF2aXF0aXR4cHRmaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjgwOTUsImV4cCI6MjA5NDEwNDA5NX0.tTUHcNpSaWzH6WkOm5wx4xT-W9f-qRv9_wDllbwZ2dU',
)

export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } },
) {
  const { courseId } = params

  // ── 1. Check Supabase cache ──────────────────────────────────────────────
  try {
    const { data: cached } = await sb
      .from('golf_course_details_cache')
      .select('data, cached_at')
      .eq('course_id', courseId)
      .maybeSingle()

    if (cached) {
      const age = (Date.now() - new Date(cached.cached_at).getTime()) / 86_400_000
      if (age < CACHE_TTL_DAYS) {
        return NextResponse.json({ ...cached.data, cached: true })
      }
    }
  } catch {
    // Cache table may not exist yet — fall through to live API
  }

  // ── 2. Call GolfAPI.io ───────────────────────────────────────────────────
  try {
    const res  = await fetch(`${GOLF_BASE}/courses/${courseId}?apikey=${GOLF_KEY}`)
    const data = await res.json()

    // ── 3. Write to cache (best-effort) ──────────────────────────────────
    try {
      await sb.from('golf_course_details_cache').upsert({
        course_id: courseId,
        data,
        cached_at: new Date().toISOString(),
      })
    } catch { /* ignore cache write failure */ }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 502 })
  }
}
