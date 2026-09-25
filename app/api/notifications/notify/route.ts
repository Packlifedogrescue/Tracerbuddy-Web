import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST /api/notifications/notify — triggered by the client right after it writes
// a comment or reaction. Community writes stay client-side (direct to Supabase,
// same as everywhere else in the dashboard); this just handles the "tell the post
// owner" side effect, which needs the service role key to look up someone else's
// device tokens and so can't happen from the browser.
export async function POST(req: NextRequest) {
  try {
    const { type, postId, actorId, actorName, emoji } = await req.json()
    if (!type || !postId) return NextResponse.json({ error: 'type and postId required' }, { status: 400 })

    const { data: post } = await sb()
      .from('community_posts')
      .select('user_id, title')
      .eq('id', postId)
      .single()

    // Post gone, or the post owner is the one who just commented/reacted on
    // their own post — nothing to notify either way.
    if (!post || post.user_id === actorId) return NextResponse.json({ ok: true })

    const name = actorName || 'Someone'
    let payload: { title: string; body: string } | null = null

    if (type === 'comment') {
      payload = { title: 'New comment', body: `${name} commented on "${post.title}"` }
    } else if (type === 'reaction') {
      payload = { title: 'New reaction', body: `${name} reacted ${emoji || ''} to "${post.title}"`.trim() }
    } else {
      return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
    }

    // Awaited, not fire-and-forget — a serverless function can be torn down
    // right after it responds, which would kill an in-flight send that wasn't
    // awaited first. sendPushToUser already handles "no post owner" / "no
    // devices" gracefully, so this never throws in the common case.
    await sendPushToUser(post.user_id, payload).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
