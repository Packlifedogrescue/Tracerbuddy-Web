import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ACTIVE_EVENTS   = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'TRANSFER', 'UNCANCELLATION'])
const INACTIVE_EVENTS = new Set(['EXPIRATION', 'BILLING_ISSUE', 'CANCELLATION'])

function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin env vars missing')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event      = body?.event
  const eventType  = event?.type as string | undefined
  const appUserId  = event?.app_user_id as string | undefined

  if (!eventType || !appUserId) {
    return NextResponse.json({ error: 'Missing event type or app_user_id' }, { status: 400 })
  }

  // Determine new subscription status
  let newSubscription: string | null = null
  if (ACTIVE_EVENTS.has(eventType))   newSubscription = 'pro'
  if (INACTIVE_EVENTS.has(eventType)) newSubscription = 'free'

  // Ignore events we don't care about (TEST, etc.)
  if (!newSubscription) {
    return NextResponse.json({ received: true, action: 'ignored', eventType })
  }

  try {
    const db = adminSupabase()

    // Try updating by `id` (common Supabase pattern where profile PK = auth UUID)
    const { data: byId, error: idError } = await db
      .from('user_profiles')
      .update({ subscription: newSubscription })
      .eq('id', appUserId)
      .select('id')

    // If no rows matched by `id`, try `user_id` column as fallback
    if (!idError && (!byId || byId.length === 0)) {
      await db
        .from('user_profiles')
        .update({ subscription: newSubscription })
        .eq('user_id', appUserId)
    }

    return NextResponse.json({
      received: true,
      eventType,
      appUserId,
      subscription: newSubscription,
    })
  } catch (e: any) {
    console.error('RevenueCat webhook error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
