import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { currentHandicap, targetHandicap, rounds, timeframeMonths } = await req.json()

    if (currentHandicap == null) return NextResponse.json({ error: 'currentHandicap required' }, { status: 400 })

    const strokesNeeded = currentHandicap - (targetHandicap ?? currentHandicap - 3)
    const avgGir = rounds?.length ? rounds.reduce((s: number, r: any) => s + (r.gir_count ?? 0), 0) / rounds.length : null
    const avgPutts = rounds?.length ? rounds.reduce((s: number, r: any) => s + (r.putts ?? 0), 0) / rounds.length : null
    const avgFairways = rounds?.length ? rounds.reduce((s: number, r: any) => s + (r.fairways_hit ?? 0), 0) / rounds.length : null

    const prompt = `You are a PGA teaching professional building a handicap improvement plan.

Player profile:
- Current handicap: ${currentHandicap}
- Target handicap: ${targetHandicap ?? currentHandicap - 3}
- Strokes needed: ${strokesNeeded.toFixed(1)}
- Timeframe: ${timeframeMonths ?? 6} months
${avgGir != null ? `- Avg GIR: ${avgGir.toFixed(1)}/18` : ''}
${avgPutts != null ? `- Avg putts: ${avgPutts.toFixed(1)}` : ''}
${avgFairways != null ? `- Avg fairways: ${avgFairways.toFixed(1)}/14` : ''}

Create a specific improvement plan with:
1. ASSESSMENT — is the target realistic in the timeframe?
2. PRIMARY FOCUS — the single highest-leverage area to improve (based on stats)
3. 30-DAY PLAN — specific weekly practice priorities
4. ON-COURSE STRATEGY — scoring adjustments to implement immediately
5. MILESTONES — checkpoints to track progress

Be specific with drills, targets, and time allocations. Plain text with section headers in caps.`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const plan = (msg.content[0] as any).text ?? ''
    return NextResponse.json({ plan, strokesNeeded: parseFloat(strokesNeeded.toFixed(1)) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
