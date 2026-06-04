import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const firstName = name?.split(' ')[0] || 'Golfer'

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="background:#0D2818;border-radius:16px;padding:36px 32px;text-align:center;margin-bottom:20px">
      <div style="color:#C9A84C;font-size:11px;font-weight:800;letter-spacing:2.5px;margin-bottom:10px">TRACERBUDDY</div>
      <div style="color:white;font-size:30px;font-weight:900;margin-bottom:6px">Welcome, ${firstName}.</div>
      <div style="color:rgba(255,255,255,0.55);font-size:15px">Your first round is on us.</div>
    </div>

    <!-- Main card -->
    <div style="background:white;border-radius:16px;padding:28px;margin-bottom:16px">
      <p style="font-size:16px;color:#222;line-height:1.65;margin:0 0 20px">
        You just joined the golfers who actually know where they're losing strokes. Most golfers finish a round with no idea what went wrong. You won't.
      </p>

      <div style="border-top:1px solid #f0ebe0;padding-top:20px;margin-bottom:20px">
        <div style="font-size:11px;font-weight:800;color:#C9A84C;letter-spacing:1.5px;margin-bottom:14px">WHAT YOU GET — FREE</div>
        ${[
          ['1 full round tracked', 'Scorecard, stats, hole breakdown — everything.'],
          ['AI Coach Card', 'Your biggest strokes leak and a custom fix after the round.'],
          ['Course Map', 'GPS yardages and satellite view for any of 42,000+ courses.'],
          ['Apple Watch sync', 'Swing speed and motion data automatically captured.'],
        ].map(([title, desc]) => `
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="width:20px;height:20px;border-radius:50%;background:#C9A84C;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">
            <div style="width:8px;height:8px;border-right:2px solid white;border-bottom:2px solid white;transform:rotate(45deg) translate(-1px,-2px)"></div>
          </div>
          <div>
            <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:2px">${title}</div>
            <div style="font-size:13px;color:#777;line-height:1.5">${desc}</div>
          </div>
        </div>`).join('')}
      </div>

      <a href="https://tracerbuddy.app/dashboard" style="display:block;background:#C9A84C;color:white;font-size:15px;font-weight:800;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;letter-spacing:0.3px">
        Go to Your Dashboard →
      </a>
    </div>

    <!-- Upgrade nudge -->
    <div style="background:#1A1A1A;border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">
      <div style="color:#C9A84C;font-size:11px;font-weight:800;letter-spacing:1.5px;margin-bottom:8px">WANT UNLIMITED ROUNDS?</div>
      <div style="color:white;font-size:17px;font-weight:700;margin-bottom:6px">Upgrade to Pro — $9.99/mo</div>
      <div style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.55">Unlimited rounds, full AI coaching, and every feature unlocked. Open the TracerBuddy iOS app and tap <strong style="color:rgba(255,255,255,0.75)">Profile → Upgrade to Pro</strong>.</div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:12px;color:#aaa;font-size:11px">
      <div style="margin-bottom:4px">TracerBuddy · Golf. Evolved.</div>
      <div>tracerbuddy.app · Questions? <a href="mailto:support@tracerbuddy.app" style="color:#C9A84C;text-decoration:none">support@tracerbuddy.app</a></div>
    </div>

  </div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'TracerBuddy <noreply@tracerbuddy.app>',
        to:      [email],
        subject: `Welcome to TracerBuddy, ${firstName} — your first round is free`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('Welcome email failed:', err)
      return NextResponse.json({ error: 'email send failed' }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (e: any) {
    console.error('Welcome email error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
