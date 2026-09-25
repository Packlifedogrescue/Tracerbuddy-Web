import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { prompt, images = [] } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    const content: any[] = [
      ...images.map((b64: string) => ({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
      })),
      { type: 'text', text: prompt },
    ]

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })

    return NextResponse.json({ text: (msg.content[0] as any)?.text ?? '' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
