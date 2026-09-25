// Apple Push Notification service (APNs) sender.
//
// Built on Node's built-in http2 + crypto rather than a library like node-apn —
// node-apn assumes a long-lived connection pool, which doesn't fit a serverless
// function that spins up, sends a handful of notifications, and exits. A fresh
// HTTP/2 connection per invocation (reused across the notifications sent within
// that one invocation) is simpler and matches how these routes actually run.
//
// Required environment variables (set in Vercel):
//   APNS_KEY_P8    — the full contents of the .p8 auth key file, including the
//                    "-----BEGIN PRIVATE KEY-----" / "-----END PRIVATE KEY-----" lines
//   APNS_KEY_ID    — the 10-character Key ID shown on the key's page in
//                    developer.apple.com → Certificates, IDs & Profiles → Keys
//   APNS_TEAM_ID   — your Apple Developer Team ID (top-right of the developer
//                    portal, or Membership details)
//
// APNS_USE_SANDBOX is optional — set to "1" only when testing against a
// Debug-signed build launched from Xcode. TestFlight and App Store builds use
// production APNs (the default).

import crypto from 'crypto'
import http2 from 'http2'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUNDLE_ID = 'com.brettmiller.TracerBuddy'

// APNs wants the provider JWT re-signed at most once an hour — cache it instead
// of generating a new one per notification.
let cachedToken: { jwt: string; issuedAt: number } | null = null

function apnsJWT(): string {
  const keyId  = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const key    = process.env.APNS_KEY_P8
  if (!keyId || !teamId || !key) {
    throw new Error('APNs not configured — missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_KEY_P8')
  }

  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && now - cachedToken.issuedAt < 60 * 50) return cachedToken.jwt

  const header  = { alg: 'ES256', kid: keyId }
  const payload = { iss: teamId, iat: now }
  const encode  = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key,
    dsaEncoding: 'ieee-p1363', // APNs wants raw r||s, not the DER encoding Node defaults to
  })

  const jwt = `${signingInput}.${signature.toString('base64url')}`
  cachedToken = { jwt, issuedAt: now }
  return jwt
}

export interface PushPayload {
  title: string
  body: string
  badge?: number
  data?: Record<string, string>
}

export type PushResult =
  | { ok: true }
  | { ok: false; shouldRemoveToken: boolean; reason: string }

// Sends to one device token. shouldRemoveToken is set for the specific APNs
// reasons that mean the token is permanently dead (app uninstalled, token
// rotated) — callers should delete the row from device_tokens when they see it,
// rather than leaving it to fail forever on every future push.
export function sendPush(deviceToken: string, payload: PushPayload): Promise<PushResult> {
  const useSandbox = process.env.APNS_USE_SANDBOX === '1'
  const host = useSandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com'

  return new Promise((resolve) => {
    let client: http2.ClientHttp2Session
    try {
      client = http2.connect(`https://${host}`)
    } catch (e: any) {
      resolve({ ok: false, shouldRemoveToken: false, reason: `connect failed: ${e.message}` })
      return
    }

    client.on('error', (e) => {
      resolve({ ok: false, shouldRemoveToken: false, reason: `connection error: ${e.message}` })
    })

    const body = JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: 'default',
        ...(payload.badge != null ? { badge: payload.badge } : {}),
      },
      ...(payload.data ?? {}),
    })

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${apnsJWT()}`,
      'apns-topic': BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    })

    let status = 0
    let responseBody = ''
    req.on('response', (headers) => { status = Number(headers[':status']) || 0 })
    req.on('data', (chunk) => { responseBody += chunk })
    req.on('end', () => {
      client.close()
      if (status === 200) { resolve({ ok: true }); return }
      // BadDeviceToken / Unregistered are APNs' way of saying "this token will
      // never work again" — DeviceTokenNotForTopic means it was issued for a
      // different bundle id (e.g. a dev build) and is equally permanent for us.
      let reason = `HTTP ${status}`
      try { reason = JSON.parse(responseBody).reason ?? reason } catch { /* non-JSON body */ }
      const deadTokenReasons = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'])
      resolve({ ok: false, shouldRemoveToken: deadTokenReasons.has(reason), reason })
    })
    req.on('error', (e) => {
      resolve({ ok: false, shouldRemoveToken: false, reason: `request error: ${e.message}` })
    })
    req.write(body)
    req.end()
  })
}

// Looks up every device this user has registered, sends to each, and deletes
// any token APNs reports as permanently dead. Silently no-ops for a user with
// no registered devices (e.g. notifications not yet granted) — a missing push
// is never the failure that should surface to whoever triggered it.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!process.env.APNS_KEY_P8) return // not configured yet — no-op, don't throw

  const { data: tokens } = await sb()
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('platform', 'ios')

  if (!tokens || tokens.length === 0) return

  const results = await Promise.all(
    tokens.map(async (t) => ({ token: t.token, result: await sendPush(t.token, payload) }))
  )

  const deadTokens = results.filter(r => !r.result.ok && r.result.shouldRemoveToken).map(r => r.token)
  if (deadTokens.length > 0) {
    await sb().from('device_tokens').delete().in('token', deadTokens)
  }
}
