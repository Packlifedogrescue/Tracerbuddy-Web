import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

const DAILY_LIMIT = 100

export async function POST(req: NextRequest) {
  try {
    const { messages, system, userId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    // Per-user daily limit
    if (userId) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: usage } = await sb()
        .from('caddie_usage')
        .select('msg_count')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single()

      if ((usage?.msg_count ?? 0) >= DAILY_LIMIT) {
        return NextResponse.json(
          { error: 'Daily caddie limit reached. Resets at midnight.' },
          { status: 429 }
        )
      }
    }

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      system: system ?? '',
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    // Extended thinking returns multiple content blocks — extract only the text reply
    const reply = msg.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('')

    // Increment usage counter
    if (userId) {
      const today = new Date().toISOString().slice(0, 10)
      await sb().rpc('increment_caddie_usage', { p_user_id: userId, p_date: today })
    }

    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
