import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { logError } from '@/lib/logError'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { round, holeStats, clubProfiles } = await req.json()

    if (!round) return NextResponse.json({ error: 'Round data required' }, { status: 400 })

    const par        = round.course_par ?? 72
    const score      = round.total_score ?? par
    const toPar      = score - par
    const toParStr   = toPar === 0 ? 'even par' : toPar > 0 ? `+${toPar}` : `${toPar}`
    const gir        = round.gir_count ?? 0
    const putts      = round.putts ?? 0
    const fairways   = round.fairways_hit ?? 0
    const fwTotal    = round.fairways_total ?? 14
    const birdies    = round.birdies_or_better ?? 0
    const pars       = round.pars ?? 0
    const bogeys     = round.bogeys ?? 0
    const doubles    = round.doubles_or_worse ?? 0
    const penalties  = round.total_penalties ?? 0
    const threePutts = round.three_putts ?? 0
    const onePutts   = round.one_putts ?? 0

    const holeBreakdown = holeStats?.length
      ? holeStats.map((h: any) =>
          `Hole ${h.hole}: Par ${h.par}, Score ${h.score} (${h.score - h.par > 0 ? '+' : ''}${h.score - h.par === 0 ? 'E' : h.score - h.par}), ${h.putts ?? '?'} putts${h.gir ? ', GIR' : ''}${h.fairway_hit ? ', FIR' : ''}`
        ).join('\n')
      : 'Hole-by-hole data not available'

    const clubData = clubProfiles?.length
      ? clubProfiles.map((c: any) => `${c.club_name}: avg ${c.avg_yards}yds (${c.shot_count} shots)`).join(', ')
      : 'No club data available'

    const prompt = `You are an expert PGA golf coach analyzing a round. Give a direct, specific, data-driven analysis.

ROUND DATA:
Course: ${round.course_name ?? 'Unknown'}
Score: ${score} (${toParStr})
Par: ${par}
GIR: ${gir}/18 (${Math.round((gir / 18) * 100)}%)
Fairways: ${fairways}/${fwTotal} (${Math.round((fairways / fwTotal) * 100)}%)
Putts: ${putts} total (avg ${(putts / 18).toFixed(1)}/hole)
1-putts: ${onePutts} · 3-putts: ${threePutts}
Birdies+: ${birdies} · Pars: ${pars} · Bogeys: ${bogeys} · Double+: ${doubles}
Penalties: ${penalties}

HOLE BY HOLE:
${holeBreakdown}

CLUB AVERAGES:
${clubData}

Respond with ONLY valid JSON, no markdown, no explanation outside the JSON:
{
  "biggest_leak": "One specific sentence about the #1 scoring leak this round",
  "club_misfiring": "Which club cost the most strokes and why (be specific)",
  "miss_pattern": "Describe the miss pattern (e.g. short right on approaches, pulled putts)",
  "hot_club": "Which club performed best this round",
  "putts_analysis": "Specific putting analysis based on the numbers",
  "next_round_focus": "Single most important thing to focus on next round",
  "practice_target": "Specific drill or practice focus that will fix the biggest leak",
  "ai_coach_text": "3-4 sentence full analysis — be direct, specific, reference actual numbers from the round",
  "strokes_lost": <number — estimated strokes dropped vs scratch due to biggest leak>
}`

    const message = await anthropic.messages.create({
      model:      'claude-opus-4-7',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw  = (message.content[0] as any).text ?? ''
    const json = JSON.parse(raw)

    return NextResponse.json({ analysis: json })
  } catch (e: any) {
    console.error('AI coach error:', e)
    await logError('/api/ai/coach', e.message ?? 'Analysis failed', 500)
    return NextResponse.json({ error: e.message ?? 'Analysis failed' }, { status: 500 })
  }
}
