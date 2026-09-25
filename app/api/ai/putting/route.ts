import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { stats } = await req.json()

    const {
      totalHoles, avgPerHole, onePutts, threePutts,
      shortMisses, longMisses, leftMisses, rightMisses,
      topCauses, distanceBuckets, trendDirection,
    } = stats

    const missTotal = shortMisses + longMisses + leftMisses + rightMisses
    const dominantMiss = [
      { dir: 'Short', n: shortMisses },
      { dir: 'Long',  n: longMisses  },
      { dir: 'Left',  n: leftMisses  },
      { dir: 'Right', n: rightMisses },
    ].sort((a, b) => b.n - a.n)[0]

    const distanceStr = distanceBuckets?.length
      ? distanceBuckets.map((b: any) => `${b.label}: ${b.makes}/${b.total} (${b.pct}%)`).join(', ')
      : 'Distance data not available'

    const causeStr = topCauses?.length
      ? topCauses.map(([c, n]: [string, number]) => `${c} (×${n})`).join(', ')
      : 'No 3-putt causes logged'

    const prompt = `You are an expert putting coach. Analyse this player's putting stats and give direct, drill-based advice.

PUTTING DATA (${totalHoles} holes tracked):
Average putts per hole: ${avgPerHole}
1-putts: ${onePutts}
3-putts: ${threePutts}
Dominant miss: ${dominantMiss?.dir} (${dominantMiss?.n} times out of ${missTotal} misses)
Miss breakdown — Short: ${shortMisses}, Long: ${longMisses}, Left: ${leftMisses}, Right: ${rightMisses}
3-putt causes: ${causeStr}
Make % by distance: ${distanceStr}
Trend: ${trendDirection}

Respond with ONLY valid JSON, no markdown:
{
  "headline": "One sharp sentence summing up this player's putting in plain language",
  "biggest_issue": "The single most damaging putting habit based on the data",
  "drill_1": {
    "name": "Name of a specific putting drill",
    "how": "2 sentences on exactly how to do it",
    "targets": "What metric improves and by how much"
  },
  "drill_2": {
    "name": "Second drill targeting a different weakness",
    "how": "2 sentences on exactly how to do it",
    "targets": "What metric improves and by how much"
  },
  "on_course_tip": "One thing to think about on the course next round",
  "green_reading_note": "${dominantMiss?.dir === 'Left' || dominantMiss?.dir === 'Right' ? 'Specific read adjustment for this miss pattern' : 'Speed control tip based on short/long misses'}"
}`

    const message = await anthropic.messages.create({
      model:      'claude-opus-4-7',
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw  = (message.content[0] as any).text ?? ''
    const json = JSON.parse(raw)
    return NextResponse.json({ analysis: json })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Analysis failed' }, { status: 500 })
  }
}
