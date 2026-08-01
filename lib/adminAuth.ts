import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export const ADMIN_EMAILS = ['miller.brett88@gmail.com', 'brett@tracerbuddy.com']

// Verifies the caller is a signed-in admin by validating their Supabase access
// token server-side — NOT by trusting a client-supplied header. Returns the
// admin's email on success, or null if the token is missing/invalid/non-admin.
//
// The client must send `Authorization: Bearer <supabase access_token>`.
export async function verifyAdmin(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  // Anon client — getUser(token) validates the JWT signature against the
  // project's keys and returns the real user it was issued to. A forged or
  // stale token yields no user.
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user?.email) return null

  const email = user.email.toLowerCase()
  return ADMIN_EMAILS.includes(email) ? email : null
}
