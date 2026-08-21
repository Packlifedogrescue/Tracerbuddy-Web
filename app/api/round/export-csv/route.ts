import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { rounds, holeStats } = await req.json()

    if (!rounds?.length) return NextResponse.json({ error: 'rounds required' }, { status: 400 })

    const lines: string[] = []

    // ── Round summary CSV ────────────────────────────────────────────────────
    lines.push('ROUND SUMMARY')
    lines.push('Date,Course,Score,Par,+/-,GIR,Putts,Fairways,Birdies,Bogeys,Doubles+')

    for (const r of rounds) {
      const toPar = (r.total_score ?? 0) - (r.course_par ?? 72)
      lines.push([
        r.played_at ? new Date(r.played_at).toLocaleDateString() : '',
        `"${r.course_name ?? ''}"`,
        r.total_score ?? '',
        r.course_par ?? 72,
        toPar > 0 ? `+${toPar}` : toPar,
        r.gir_count ?? '',
        r.putts ?? '',
        r.fairways_hit != null ? `${r.fairways_hit}/${r.fairways_total ?? 14}` : '',
        r.birdies_or_better ?? '',
        r.bogeys ?? '',
        r.doubles_or_worse ?? '',
      ].join(','))
    }

    // ── Hole-by-hole stats if provided ───────────────────────────────────────
    if (holeStats?.length) {
      lines.push('')
      lines.push('HOLE BY HOLE')
      lines.push('Hole,Par,Score,+/-,Putts,GIR,FIR,Sand Save')
      for (const h of holeStats) {
        const diff = (h.score ?? 0) - (h.par ?? 0)
        lines.push([
          h.hole,
          h.par ?? '',
          h.score ?? '',
          diff > 0 ? `+${diff}` : diff,
          h.putts ?? '',
          h.gir ? 'Yes' : 'No',
          h.fir != null ? (h.fir ? 'Yes' : 'No') : '',
          h.sandSave != null ? (h.sandSave ? 'Yes' : 'No') : '',
        ].join(','))
      }
    }

    const csv = lines.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tracerbuddy-rounds-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
