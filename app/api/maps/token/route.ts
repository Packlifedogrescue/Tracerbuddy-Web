import { NextResponse } from 'next/server'
import { createSign } from 'crypto'

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function GET() {
  const keyId      = process.env.APPLE_MAPS_KEY_ID ?? ''
  const teamId     = process.env.APPLE_MAPS_TEAM_ID ?? ''
  const privateKey = (process.env.APPLE_MAPS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')

  if (!keyId || !teamId || !privateKey) {
    return NextResponse.json({ error: 'Apple Maps not configured' }, { status: 503 })
  }

  const header  = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))
  const now     = Math.floor(Date.now() / 1000)
  const payload = base64url(JSON.stringify({ iss: teamId, iat: now, exp: now + 1800, origin: 'https://tracerbuddy.app' }))
  const data    = `${header}.${payload}`

  const signer = createSign('SHA256')
  signer.update(data)
  const sig   = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
  const token = `${data}.${base64url(sig)}`

  return NextResponse.json({ token }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
