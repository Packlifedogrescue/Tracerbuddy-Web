import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { round, holeStats, userEmail, userName } = await req.json()

    if (!round || !userEmail) {
      return NextResponse.json({ error: 'round and userEmail required' }, { status: 400 })
    }

    const par       = round.course_par ?? 72
    const score     = round.total_score ?? par
    const toPar     = score - par
    const toParStr  = toPar === 0 ? 'Even' : toPar > 0 ? `+${toPar}` : `${toPar}`
    const gir       = round.gir_count ?? 0
    const putts     = round.putts ?? 0
    const fairways  = round.fairways_hit ?? 0
    const fwTotal   = round.fairways_total ?? 14
    const birdies   = round.birdies_or_better ?? 0
    const bogeys    = round.bogeys ?? 0
    const doubles   = round.doubles_or_worse ?? 0

    const holeRows = holeStats?.length
      ? holeStats.map((h: any) => {
          const diff = h.score - h.par
          const diffStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
          return `<tr style="border-bottom:1px solid #f0ebe0">
            <td style="padding:6px 12px;text-align:center;font-weight:700">${h.hole}</td>
            <td style="padding:6px 12px;text-align:center">${h.par}</td>
            <td style="padding:6px 12px;text-align:center;font-weight:700;color:${diff < 0 ? '#059669' : diff > 1 ? '#DC2626' : diff === 1 ? '#555' : '#111'}">${h.score} (${diffStr})</td>
            <td style="padding:6px 12px;text-align:center">${h.putts ?? '—'}</td>
            <td style="padding:6px 12px;text-align:center">${h.gir ? '✓' : '—'}</td>
          </tr>`
        }).join('')
      : ''

    // Generate AI summary
    const aiPrompt = `Write a short, encouraging 2-3 sentence post-round summary email for a golfer named ${userName ?? 'Golfer'}.
Round: ${score} (${toParStr}) at ${round.course_name ?? 'the course'}
GIR: ${gir}/18, Putts: ${putts}, Fairways: ${fairways}/${fwTotal}, Birdies: ${birdies}, Bogeys: ${bogeys}, Doubles+: ${doubles}
Be specific about one strength and one area to work on. Keep it motivating and personal. Plain text only, no markdown.`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: aiPrompt }],
    })
    const aiSummary = (msg.content[0] as any).text ?? ''

    const scoreColor = toPar < 0 ? '#059669' : toPar > 3 ? '#DC2626' : '#DF9905'

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="background:#0D2818;border-radius:16px;padding:32px;text-align:center;margin-bottom:20px">
      <div style="color:#C9A84C;font-size:11px;font-weight:800;letter-spacing:2px;margin-bottom:8px">TRACERBUDDY</div>
      <div style="color:white;font-size:28px;font-weight:900">Round Complete</div>
      <div style="color:rgba(255,255,255,0.6);font-size:14px;margin-top:4px">${round.course_name ?? 'Golf Course'}</div>
    </div>

    <!-- Score card -->
    <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;text-align:center">
      <div style="font-size:64px;font-weight:900;color:${scoreColor};line-height:1">${score}</div>
      <div style="font-size:22px;font-weight:700;color:${scoreColor}">${toParStr}</div>
      <div style="color:#888;font-size:13px;margin-top:4px">Par ${par}</div>

      <div style="display:flex;justify-content:center;gap:0;margin-top:24px;border-top:1px solid #f0ebe0;padding-top:20px">
        ${[
          { label: 'GIR', value: `${gir}/18` },
          { label: 'Putts', value: putts },
          { label: 'Fairways', value: `${fairways}/${fwTotal}` },
          { label: 'Birdies', value: birdies },
        ].map(s => `
          <div style="flex:1;text-align:center;padding:0 8px;border-right:1px solid #f0ebe0">
            <div style="font-size:20px;font-weight:800;color:#111">${s.value}</div>
            <div style="font-size:10px;font-weight:600;color:#888;letter-spacing:1px;text-transform:uppercase;margin-top:2px">${s.label}</div>
          </div>`).join('')}
        <div style="flex:1;text-align:center;padding:0 8px">
          <div style="font-size:20px;font-weight:800;color:#111">${bogeys}</div>
          <div style="font-size:10px;font-weight:600;color:#888;letter-spacing:1px;text-transform:uppercase;margin-top:2px">Bogeys</div>
        </div>
      </div>
    </div>

    <!-- AI Summary -->
    <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:800;color:#C9A84C;letter-spacing:1.5px;margin-bottom:12px">CADDIE NOTES</div>
      <div style="font-size:15px;color:#444;line-height:1.6">${aiSummary}</div>
    </div>

    ${holeRows ? `
    <!-- Scorecard table -->
    <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;overflow:hidden">
      <div style="font-size:11px;font-weight:800;color:#888;letter-spacing:1.5px;margin-bottom:16px">HOLE BY HOLE</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="border-bottom:2px solid #f0ebe0">
            <th style="padding:6px 12px;text-align:center;color:#888;font-size:10px;letter-spacing:1px">HOLE</th>
            <th style="padding:6px 12px;text-align:center;color:#888;font-size:10px;letter-spacing:1px">PAR</th>
            <th style="padding:6px 12px;text-align:center;color:#888;font-size:10px;letter-spacing:1px">SCORE</th>
            <th style="padding:6px 12px;text-align:center;color:#888;font-size:10px;letter-spacing:1px">PUTTS</th>
            <th style="padding:6px 12px;text-align:center;color:#888;font-size:10px;letter-spacing:1px">GIR</th>
          </tr>
        </thead>
        <tbody>${holeRows}</tbody>
      </table>
    </div>` : ''}

    <!-- Footer -->
    <div style="text-align:center;padding:16px;color:#aaa;font-size:11px">
      <div style="margin-bottom:4px">TracerBuddy · Golf. Evolved.</div>
      <div>tracerbuddy.com</div>
    </div>
  </div>
</body>
</html>`

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'TracerBuddy <noreply@tracerbuddy.com>',
        to:      [userEmail],
        subject: `Round Summary: ${score} (${toParStr}) at ${round.course_name ?? 'the course'}`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      return NextResponse.json({ error: `Resend error: ${err}` }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (e: any) {
    console.error('Email summary error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
