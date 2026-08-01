// Golf Intelligence API helper.
//
// Auth is OAuth2 "password" grant: POST the account username+password to
// /auth/authenticateToken (form-encoded) to get an access_token, then call the
// API with `Authorization: Bearer <access_token>`. Credentials come from Vercel
// env — never the client. The access token is cached in module scope until it
// nears expiry so we don't re-auth on every request.
//
// Env required (set in Vercel):
//   GOLF_INTELLIGENCE_USERNAME
//   GOLF_INTELLIGENCE_PASSWORD
//   GOLF_INTELLIGENCE_BASE_URL   (optional; defaults to https://api.golfintelligence.com)

const BASE = process.env.GOLF_INTELLIGENCE_BASE_URL || 'https://api.golfintelligence.com'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token

  const username = process.env.GOLF_INTELLIGENCE_USERNAME
  const password = process.env.GOLF_INTELLIGENCE_PASSWORD
  if (!username || !password) {
    throw new Error('Golf Intelligence credentials not configured (GOLF_INTELLIGENCE_USERNAME/PASSWORD)')
  }

  // scope=openid matches the API's declared oauth2 security definition.
  const body = new URLSearchParams({ grant_type: 'password', username, password, scope: 'openid' })
  const res = await fetch(`${BASE}/auth/authenticateToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    // never redirect-follow into the HTML login page; treat non-2xx as failure
    redirect: 'manual',
    cache: 'no-store',
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Golf Intelligence auth failed (${res.status}): ${t.slice(0, 200)}`)
  }

  const json: any = await res.json()
  const token = json.access_token as string | undefined
  if (!token) throw new Error('Golf Intelligence auth returned no access_token')
  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600
  cachedToken = { token, expiresAt: now + expiresIn * 1000 }
  return token
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
