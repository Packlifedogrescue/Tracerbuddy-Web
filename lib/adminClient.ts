import { supabase } from './supabase'

// Client-side: build the Authorization header the admin API routes now require.
// Sends the caller's real Supabase access token; the server verifies it and
// checks the email against the admin allowlist (see lib/adminAuth.ts).
export async function adminAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
