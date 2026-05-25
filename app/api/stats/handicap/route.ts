import { NextRequest, NextResponse } from 'next/server'

// World Handicap System (WHS) calculation
// Uses best 8 of last 20 score differentials

function scoreDifferential(gross: number, courseRating: number, slopeRating: number, par: number): number {
  // WHS formula: (113 / Slope) × (Adjusted Gross Score - Course Rating - PCC)
  // PCC (Playing Conditions Calculation) defaulted to 0 for simplicity
  return parseFloat(((113 / slopeRating) * (gross - courseRating)).toFixed(1))
}

function calcHandicapIndex(differentials: number[]): number {
  if (differentials.length === 0) return 0

  const sorted = [...differentials].sort((a, b) => a - b)

  // WHS: number of differentials to use based on how many rounds available
  const countMap: Record<number, number> = {
    3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3,
    11: 4, 12: 4, 13: 5, 14: 5, 15: 6, 16: 6, 17: 7, 18: 8,
    19: 8, 20: 8,
  }
  const count = countMap[Math.min(sorted.length, 20)] ?? 8
  const best = sorted.slice(0, count)
  const avg = best.reduce((s, d) => s + d, 0) / best.length

  // Apply 96% multiplier
  return parseFloat((avg * 0.96).toFixed(1))
}

export async function POST(req: NextRequest) {
  try {
    const { rounds } = await req.json()

    if (!rounds?.length) return NextResponse.json({ error: 'rounds array required' }, { status: 400 })

    // Use last 20 rounds
    const recent = rounds.slice(0, 20)

    const differentials = recent
      .filter((r: any) => r.total_score && r.course_rating && r.slope_rating)
      .map((r: any) => scoreDifferential(
        r.total_score,
        r.course_rating,
        r.slope_rating,
        r.course_par ?? 72,
      ))

    if (differentials.length < 3) {
      return NextResponse.json({
        handicapIndex: null,
        message: `Need at least 3 rounds with course rating/slope. Have ${differentials.length}.`,
        differentials: [],
      })
    }

    const handicapIndex = calcHandicapIndex(differentials)

    // Trend: compare last 5 vs prior 5
    const recentDiffs = differentials.slice(0, 5)
    const priorDiffs = differentials.slice(5, 10)
    const recentAvg = recentDiffs.reduce((s, d) => s + d, 0) / recentDiffs.length
    const priorAvg = priorDiffs.length ? priorDiffs.reduce((s, d) => s + d, 0) / priorDiffs.length : recentAvg
    const trend = recentAvg < priorAvg - 0.5 ? 'improving' : recentAvg > priorAvg + 0.5 ? 'regressing' : 'stable'

    return NextResponse.json({
      handicapIndex,
      differentials,
      roundsUsed: differentials.length,
      trend,
      low: Math.min(...differentials),
      high: Math.max(...differentials),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
