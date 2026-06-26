import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { courseName, recentRounds, weatherForecast, handicap, targetScore, focusAreas } = await req.json()

    if (!courseName) return NextResponse.json({ error: 'courseName required' }, { status: 400 })

    const recentSummary = recentRounds?.length
      ? recentRounds.slice(0, 5).map((r: any) =>
          `${r.course_name}: ${r.total_score} (${r.total_score - r.course_par > 0 ? '+' : ''}${r.total_score - r.course_par}), GIR ${r.gir_count}/18, ${r.putts} putts`
        ).join('\n')
      : 'No recent rounds available'

    const prompt = `You are an expert golf caddie preparing a player for their round today.

Course: ${courseName}
Player handicap: ${handicap ?? 'unknown'}
Target score: ${targetScore ?? 'personal best'}
Weather forecast: ${weatherForecast ?? 'not available'}
Focus areas: ${focusAreas?.join(', ') ?? 'general'}

Recent rounds:
${recentSummary}

Write a concise pre-round prep brief (4-6 bullet points) covering:
1. Mental approach and realistic expectations for today
2. Specific shot strategy based on weather/conditions
3. One technical focus based on recent performance patterns
4. Club selection notes if wind is a factor
5. Scoring targets (where to attack, where to play safe)

Be specific, practical, and motivating. Plain text with bullet points using •`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const brief = (msg.content[0] as any).text ?? ''
    return NextResponse.json({ brief })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
