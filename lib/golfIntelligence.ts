// Golf Intelligence API helper.
//
// Auth (confirmed against the official Partner Postman collection): POST a
// `client_credentials` grant to /auth/authenticateToken (form-encoded) with the
// account's Active Token in a field named `code` and the numeric ClientId in
// `client_id`. That returns a Bearer `access_token`, which every /courses and
// /greens endpoint expects as `Authorization: Bearer <access_token>`.
//
//   grant_type=client_credentials
//   code=<Active Token>        (from GOLF_INTELLIGENCE_TOKEN)
//   client_id=<ClientId>       (from GOLF_INTELLIGENCE_CLIENT_ID)
//
// NOTE: this is NOT a username/password grant — the console login uses a
// one-time email code, and the account has no static password. Credentials come
// from Vercel env only, never the client. The access token is cached in module
// scope until it nears expiry so we don't re-auth on every request, and a short
// cooldown after a failed auth keeps a bad credential from hammering the
// endpoint (repeated failures lock the account out).
//
// Env required (set in Vercel):
//   GOLF_INTELLIGENCE_TOKEN        the Active Token (the `code` value)
//   GOLF_INTELLIGENCE_CLIENT_ID    the numeric ClientId
//   GOLF_INTELLIGENCE_BASE_URL     (optional; defaults to https://api.golfintelligence.com)

const BASE = process.env.GOLF_INTELLIGENCE_BASE_URL || 'https://api.golfintelligence.com'

let cachedToken: { token: string; expiresAt: number } | null = null
let authCooldownUntil = 0 // don't re-attempt auth before this (guards against lockout)

function credentials(): { token: string; clientId: string } {
  // Prefer the explicit new vars; fall back to GOLF_INTELLIGENCE_PASSWORD for the
  // token since an earlier setup may have stored the Active Token there.
  const token = process.env.GOLF_INTELLIGENCE_TOKEN || process.env.GOLF_INTELLIGENCE_PASSWORD
  const clientId = process.env.GOLF_INTELLIGENCE_CLIENT_ID
  if (!token || !clientId) {
    throw new Error('Golf Intelligence credentials not configured (GOLF_INTELLIGENCE_TOKEN/GOLF_INTELLIGENCE_CLIENT_ID)')
  }
  return { token, clientId }
}

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token
  if (now < authCooldownUntil) {
    throw new Error(`Golf Intelligence auth in cooldown (retry in ${Math.ceil((authCooldownUntil - now) / 1000)}s)`)
  }

  const { token, clientId } = credentials()

  const body = new URLSearchParams({ grant_type: 'client_credentials', code: token, client_id: clientId })
  const res = await fetch(`${BASE}/auth/authenticateToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual', // never follow into the HTML login page
    cache: 'no-store',
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    authCooldownUntil = Date.now() + 60_000 // back off so failures can't lock the account
    throw new Error(`Golf Intelligence auth failed (${res.status}): ${t.slice(0, 200)}`)
  }

  const json: any = await res.json()
  const accessToken = json.access_token as string | undefined
  if (!accessToken) {
    authCooldownUntil = Date.now() + 60_000
    throw new Error('Golf Intelligence auth returned no access_token')
  }

  // The response carries `expiration` (a date), not `expires_in`. Parse it
  // defensively and clamp to a sane window; fall back to 30 minutes.
  let expiresAt = now + 30 * 60_000
  const exp = json.expiration
  if (typeof exp === 'string') {
    const p = Date.parse(exp)
    if (!Number.isNaN(p)) expiresAt = p
  } else if (typeof exp === 'number') {
    expiresAt = exp > 1e12 ? exp : exp * 1000
  }
  // Clamp: at least 5 min out (so we actually cache), at most 6 h.
  expiresAt = Math.min(Math.max(expiresAt, now + 5 * 60_000), now + 6 * 60 * 60_000)

  cachedToken = { token: accessToken, expiresAt }
  authCooldownUntil = 0
  return accessToken
}

/** Authenticated fetch against the Golf Intelligence API (adds the Bearer token). */
export async function giFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
    redirect: 'manual',
    cache: 'no-store',
  })
}
