import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { distanceToPin, lie, windSpeed, windDirection, elevation, clubHistory, temperature } = await req.json()

    if (!distanceToPin) return NextResponse.json({ error: 'distanceToPin required' }, { status: 400 })

    // Adjust distance for wind and elevation
    const windFactor = windSpeed ? Math.round(windSpeed * 0.5 * (
      windDirection?.includes('head') ? 1 : windDirection?.includes('tail') ? -1 : 0.3
    )) : 0
    const elevFactor = elevation ? Math.round(elevation * 0.1) : 0
    const playingDistance = distanceToPin + windFactor + elevFactor

    const historyText = clubHistory?.length
      ? clubHistory.map((c: any) => `${c.club}: avg ${c.avgDistance}y, miss ${c.missPattern ?? 'center'}`).join('\n')
      : 'No club history available'

    const tempAdjust = temperature ? (temperature < 50 ? 'Cold temps — add 5-7 yards to club selection.' : temperature > 90 ? 'Hot temps — ball flies slightly farther.' : '') : ''

    const prompt = `You are an expert golf caddie recommending club selection.

Situation:
- Distance to pin: ${distanceToPin} yards
- Playing distance (adjusted for wind/elevation): ${playingDistance} yards
- Lie: ${lie ?? 'fairway'}
- Wind: ${windSpeed ? `${windSpeed}mph ${windDirection ?? ''}` : 'calm'}
- Elevation change: ${elevation ? `${elevation > 0 ? '+' : ''}${elevation} feet` : 'flat'}
${tempAdjust}

Player's club history:
${historyText}

Recommend:
1. Primary club selection with reasoning
2. Alternative club if they want to play conservative
3. One specific swing thought for this shot

Be concise and decisive. Format: PRIMARY: [club] — [reason]. ALTERNATIVE: [club]. SWING THOUGHT: [thought].`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const recommendation = (msg.content[0] as any).text ?? ''

    return NextResponse.json({
      recommendation,
      playingDistance,
      adjustments: { wind: windFactor, elevation: elevFactor },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
