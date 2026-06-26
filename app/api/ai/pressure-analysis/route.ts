import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { holeStats, currentScore, targetScore, holesRemaining, coursePar } = await req.json()

    if (!holeStats?.length) return NextResponse.json({ error: 'holeStats required' }, { status: 400 })

    // Identify pressure holes: late round holes where score differential matters most
    const toPar = currentScore - (coursePar ?? 72)
    const toParStr = toPar === 0 ? 'Even' : toPar > 0 ? `+${toPar}` : `${toPar}`

    // Find holes where player historically struggles
    const worstHoles = [...holeStats]
      .sort((a: any, b: any) => (b.avgVsPar ?? 0) - (a.avgVsPar ?? 0))
      .slice(0, 3)

    const bestHoles = [...holeStats]
      .sort((a: any, b: any) => (a.avgVsPar ?? 0) - (b.avgVsPar ?? 0))
      .slice(0, 3)

    const prompt = `You are a sports psychologist and caddie analyzing pressure situations in golf.

Current round: ${toParStr} with ${holesRemaining ?? 'several'} holes remaining
Target: ${targetScore ? `${targetScore > 0 ? '+' : ''}${targetScore}` : 'personal best'}

Historically tough holes: ${worstHoles.map((h: any) => `Hole ${h.hole} (avg ${h.avgVsPar > 0 ? '+' : ''}${h.avgVsPar?.toFixed(1) ?? '?'} vs par)`).join(', ')}
Historically strong holes: ${bestHoles.map((h: any) => `Hole ${h.hole} (avg ${h.avgVsPar > 0 ? '+' : ''}${h.avgVsPar?.toFixed(1) ?? '?'} vs par)`).join(', ')}

Provide a 3-4 sentence pressure analysis:
1. Identify the key pressure holes coming up and why
2. Suggest a specific mental strategy for staying in the moment
3. Give a realistic finish target based on current position

Be direct and specific. Plain text only.`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = (msg.content[0] as any).text ?? ''

    return NextResponse.json({
      analysis,
      pressureHoles: worstHoles.map((h: any) => h.hole),
      strongHoles: bestHoles.map((h: any) => h.hole),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
