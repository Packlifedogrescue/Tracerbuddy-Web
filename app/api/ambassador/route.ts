import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { name, email, city, handicap, social, roundsPerMonth, why } = await req.json()

  if (!name?.trim() || !email?.trim() || !city?.trim() || !why?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { error } = await sb.from('ambassador_applications').insert({
    name:             name.trim(),
    email:            email.toLowerCase().trim(),
    city:             city.trim(),
    handicap:         handicap?.trim() || null,
    social_handle:    social?.trim() || null,
    rounds_per_month: roundsPerMonth?.trim() || null,
    why:              why.trim(),
    status:           'pending',
    created_at:       new Date().toISOString(),
  })

  if (error) {
    console.error('Ambassador application insert error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
