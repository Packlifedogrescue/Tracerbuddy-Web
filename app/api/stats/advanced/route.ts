import { NextRequest, NextResponse } from 'next/server'

// Advanced stats: scrambling, sand saves, par averages, miss tendency, streaks

export async function POST(req: NextRequest) {
  try {
    const { rounds, holeStats } = await req.json()

    if (!rounds?.length) return NextResponse.json({ error: 'rounds required' }, { status: 400 })

    const totalRounds = rounds.length

    // ── Basic aggregates ────────────────────────────────────────────────────
    const avgScore     = rounds.reduce((s: number, r: any) => s + (r.total_score ?? 0), 0) / totalRounds
    const avgGir       = rounds.reduce((s: number, r: any) => s + (r.gir_count ?? 0), 0) / totalRounds
    const avgPutts     = rounds.reduce((s: number, r: any) => s + (r.putts ?? 0), 0) / totalRounds
    const avgFairways  = rounds.reduce((s: number, r: any) => s + (r.fairways_hit ?? 0), 0) / totalRounds
    const totalBirdies = rounds.reduce((s: number, r: any) => s + (r.birdies_or_better ?? 0), 0)
    const totalBogeys  = rounds.reduce((s: number, r: any) => s + (r.bogeys ?? 0), 0)
    const totalDoubles = rounds.reduce((s: number, r: any) => s + (r.doubles_or_worse ?? 0), 0)
    const totalSandSaves = rounds.reduce((s: number, r: any) => s + (r.sand_saves ?? 0), 0)
    const totalSandAttempts = rounds.reduce((s: number, r: any) => s + (r.sand_attempts ?? 0), 0)
    const totalScrambles = rounds.reduce((s: number, r: any) => s + (r.scrambles ?? 0), 0)
    const totalScrambleAttempts = rounds.reduce((s: number, r: any) => s + (r.scramble_attempts ?? 0), 0)
    const totalUpDowns = rounds.reduce((s: number, r: any) => s + (r.up_downs ?? 0), 0)
    const totalUpDownAttempts = rounds.reduce((s: number, r: any) => s + (r.up_down_attempts ?? 0), 0)

    // ── Par-type averages ────────────────────────────────────────────────────
    const par3Scores:  number[] = []
    const par4Scores:  number[] = []
    const par5Scores:  number[] = []

    for (const r of rounds) {
      if (r.par3_avg  != null) par3Scores.push(r.par3_avg)
      if (r.par4_avg  != null) par4Scores.push(r.par4_avg)
      if (r.par5_avg  != null) par5Scores.push(r.par5_avg)
    }

    const par3Avg = par3Scores.length ? par3Scores.reduce((a, b) => a + b, 0) / par3Scores.length : null
    const par4Avg = par4Scores.length ? par4Scores.reduce((a, b) => a + b, 0) / par4Scores.length : null
    const par5Avg = par5Scores.length ? par5Scores.reduce((a, b) => a + b, 0) / par5Scores.length : null

    // ── Best/worst rounds ────────────────────────────────────────────────────
    const sorted = [...rounds].sort((a: any, b: any) => a.total_score - b.total_score)
    const bestRound  = sorted[0]
    const worstRound = sorted[sorted.length - 1]

    // ── Hot streak: consecutive rounds under handicap or personal avg ────────
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak    = 0
    const targetAvg   = avgScore
    for (const r of rounds) {
      if ((r.total_score ?? 999) <= targetAvg) {
        tempStreak++
        if (rounds.indexOf(r) === 0) currentStreak = tempStreak
      } else {
        if (rounds.indexOf(r) === 0) currentStreak = 0
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 0
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    // ── Miss tendency from holeStats ─────────────────────────────────────────
    const missCounts: Record<string, number> = {}
    if (holeStats?.length) {
      for (const h of holeStats) {
        if (h.miss_direction) {
          missCounts[h.miss_direction] = (missCounts[h.miss_direction] ?? 0) + 1
        }
      }
    }
    const dominantMiss = Object.entries(missCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return NextResponse.json({
      totalRounds,
      avgScore:            parseFloat(avgScore.toFixed(1)),
      avgGir:              parseFloat(avgGir.toFixed(1)),
      avgPutts:            parseFloat(avgPutts.toFixed(1)),
      avgFairways:         parseFloat(avgFairways.toFixed(1)),
      totalBirdies,
      totalBogeys,
      totalDoubles,
      scramblingPct:       totalScrambleAttempts > 0 ? parseFloat((totalScrambles / totalScrambleAttempts * 100).toFixed(1)) : null,
      sandSavePct:         totalSandAttempts > 0 ? parseFloat((totalSandSaves / totalSandAttempts * 100).toFixed(1)) : null,
      upDownPct:           totalUpDownAttempts > 0 ? parseFloat((totalUpDowns / totalUpDownAttempts * 100).toFixed(1)) : null,
      par3Avg:             par3Avg != null ? parseFloat(par3Avg.toFixed(2)) : null,
      par4Avg:             par4Avg != null ? parseFloat(par4Avg.toFixed(2)) : null,
      par5Avg:             par5Avg != null ? parseFloat(par5Avg.toFixed(2)) : null,
      bestRound:           bestRound  ? { score: bestRound.total_score,  course: bestRound.course_name }  : null,
      worstRound:          worstRound ? { score: worstRound.total_score, course: worstRound.course_name } : null,
      currentStreak,
      longestStreak,
      dominantMiss,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
