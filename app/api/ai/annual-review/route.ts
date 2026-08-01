import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { rounds, year } = await req.json()

    if (!rounds?.length) return NextResponse.json({ error: 'rounds array required' }, { status: 400 })

    const totalRounds = rounds.length
    const avgScore = rounds.reduce((s: number, r: any) => s + (r.total_score ?? 0), 0) / totalRounds
    const avgVsPar = rounds.reduce((s: number, r: any) => s + ((r.total_score ?? 72) - (r.course_par ?? 72)), 0) / totalRounds
    const avgGir = rounds.reduce((s: number, r: any) => s + (r.gir_count ?? 0), 0) / totalRounds
    const avgPutts = rounds.reduce((s: number, r: any) => s + (r.putts ?? 0), 0) / totalRounds
    const avgFairways = rounds.reduce((s: number, r: any) => s + (r.fairways_hit ?? 0), 0) / totalRounds
    const bestRound = rounds.reduce((best: any, r: any) => (!best || r.total_score < best.total_score) ? r : best, null)
    const worstRound = rounds.reduce((worst: any, r: any) => (!worst || r.total_score > worst.total_score) ? r : worst, null)
    const birdieTotal = rounds.reduce((s: number, r: any) => s + (r.birdies_or_better ?? 0), 0)

    // Trend: compare first half vs second half
    const firstHalf = rounds.slice(0, Math.floor(totalRounds / 2))
    const secondHalf = rounds.slice(Math.floor(totalRounds / 2))
    const firstAvg = firstHalf.reduce((s: number, r: any) => s + (r.total_score ?? 0), 0) / (firstHalf.length || 1)
    const secondAvg = secondHalf.reduce((s: number, r: any) => s + (r.total_score ?? 0), 0) / (secondHalf.length || 1)
    const trend = secondAvg < firstAvg ? 'improving' : secondAvg > firstAvg + 1 ? 'regressing' : 'consistent'

    const prompt = `You are an expert golf coach writing an annual performance review for a player.

${year ?? 'This year'}'s stats (${totalRounds} rounds):
- Average score: ${avgScore.toFixed(1)} (${avgVsPar > 0 ? '+' : ''}${avgVsPar.toFixed(1)} vs par)
- Average GIR: ${avgGir.toFixed(1)}/18
- Average putts: ${avgPutts.toFixed(1)}
- Average fairways: ${avgFairways.toFixed(1)}/14
- Total birdies: ${birdieTotal}
- Best round: ${bestRound?.total_score} at ${bestRound?.course_name ?? 'unknown'}
- Trend: ${trend} (first half avg ${firstAvg.toFixed(1)}, second half avg ${secondAvg.toFixed(1)})

Write a thorough annual review with these sections:
1. YEAR IN REVIEW (2-3 sentences on overall performance)
2. BIGGEST STRENGTH (what they did well)
3. BIGGEST OPPORTUNITY (main area to improve)
4. TREND ANALYSIS (improving/regressing and why)
5. GOALS FOR NEXT YEAR (3 specific, measurable goals)

Be specific with numbers. Motivating but honest. Use plain text with section headers in caps.`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const review = (msg.content[0] as any).text ?? ''

    return NextResponse.json({
      review,
      stats: {
        totalRounds, avgScore: parseFloat(avgScore.toFixed(1)),
        avgVsPar: parseFloat(avgVsPar.toFixed(1)),
        avgGir: parseFloat(avgGir.toFixed(1)),
        avgPutts: parseFloat(avgPutts.toFixed(1)),
        avgFairways: parseFloat(avgFairways.toFixed(1)),
        birdieTotal, trend,
        bestRound: bestRound ? { score: bestRound.total_score, course: bestRound.course_name } : null,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
