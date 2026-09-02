import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/adminAuth'

// Manually-placed green positions for courses OpenStreetMap hasn't mapped.
// GET is public (the map draws a flag on each); POST is admin-only and verified
// server-side against the caller's Supabase access token.
export const runtime = 'nodejs'

interface Pt { latitude: number; longitude: number }

const anon = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Keep only well-formed lat/lng points, capped so a bad payload can't bloat a row.
function cleanGreens(input: unknown): Pt[] {
  if (!Array.isArray(input)) return []
  const out: Pt[] = []
  for (const p of input) {
    const lat = Number((p as { latitude?: unknown })?.latitude)
    const lng = Number((p as { longitude?: unknown })?.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      out.push({ latitude: lat, longitude: lng })
    }
    if (out.length >= 100) break
  }
  return out
}

// GET /api/golf/course-greens?id=COURSE_ID → { greens: [{latitude,longitude}] }
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ greens: [] })
  try {
    const { data } = await anon()
      .from('course_greens_override')
      .select('greens')
      .eq('course_id', id)
      .maybeSingle()
    return NextResponse.json({ greens: cleanGreens(data?.greens) })
  } catch {
    // Table may not exist yet — degrade to no overrides.
    return NextResponse.json({ greens: [] })
  }
}

// POST { courseId, greens:[{latitude,longitude}] } → save (admin only).
// An empty array clears the override.
export async function POST(req: NextRequest) {
  const email = await verifyAdmin(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: { courseId?: unknown; greens?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const courseId = String(body?.courseId ?? '').trim()
  if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })
  const greens = cleanGreens(body?.greens)

  try {
    const { error } = await admin()
      .from('course_greens_override')
      .upsert({ course_id: courseId, greens, updated_at: new Date().toISOString(), updated_by: email })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, greens })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
