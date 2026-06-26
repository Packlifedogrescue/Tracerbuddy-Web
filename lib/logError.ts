import { createClient } from '@supabase/supabase-js'

export async function logError(
  route: string,
  message: string,
  statusCode: number,
  userId?: string,
  metadata?: Record<string, any>,
) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return
    const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    await db.from('error_logs').insert({
      route,
      message,
      status_code: statusCode,
      user_id: userId ?? null,
      metadata: metadata ?? {},
    })
  } catch { /* never throw from error logger */ }
}
