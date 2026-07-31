import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const NOTIFY_TO = 'brett@tracerbuddy.com'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(req: NextRequest) {
  const { name, email, city, handicap, social, roundsPerMonth, why } = await req.json()

  if (!name?.trim() || !email?.trim() || !city?.trim() || !why?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const clean = {
    name:             name.trim(),
    email:            email.toLowerCase().trim(),
    city:             city.trim(),
    handicap:         handicap?.trim() || null,
    social_handle:    social?.trim() || null,
    rounds_per_month: roundsPerMonth?.trim() || null,
    why:              why.trim(),
  }

  // ── 1. Save to Supabase (durable record, backs the /admin review) ──────────
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { error } = await sb.from('ambassador_applications').insert({
    ...clean,
    status:     'pending',
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Ambassador application insert error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // ── 2. Email a copy to Brett (best-effort — never fail the submission on it) ──
  if (process.env.RESEND_API_KEY) {
    const row = (label: string, value: string | null) =>
      value
        ? `<tr><td style="padding:6px 12px;color:#888;font-size:13px;white-space:nowrap">${label}</td><td style="padding:6px 12px;color:#111;font-size:13px;font-weight:600">${escapeHtml(value)}</td></tr>`
        : ''

    const html = `<!DOCTYPE html><html><body style="margin:0;background:#F5EFE0;font-family:-apple-system,Segoe UI,sans-serif;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #EDE8DC">
        <div style="background:#1A1A1A;padding:20px 24px">
          <div style="color:#DF9905;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">New Ambassador Application</div>
          <div style="color:#fff;font-size:20px;font-weight:800;margin-top:4px">${escapeHtml(clean.name)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;padding:8px">
          ${row('Email', clean.email)}
          ${row('City', clean.city)}
          ${row('Handicap', clean.handicap)}
          ${row('Social', clean.social_handle)}
          ${row('Rounds/mo', clean.rounds_per_month)}
        </table>
        <div style="padding:12px 24px 24px">
          <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Why they want in</div>
          <div style="color:#111;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(clean.why)}</div>
        </div>
      </div>
    </body></html>`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:     'TracerBuddy <noreply@tracerbuddy.app>',
          to:       [NOTIFY_TO],
          reply_to: clean.email,   // hit reply to answer the applicant directly
          subject:  `Ambassador application — ${clean.name} (${clean.city})`,
          html,
        }),
      })
      if (!res.ok) console.error('Ambassador notify email failed:', await res.text())
    } catch (e) {
      console.error('Ambassador notify email error:', e)
    }
  }

  return NextResponse.json({ success: true })
}
