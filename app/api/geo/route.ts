import { NextRequest, NextResponse } from 'next/server'

const EU_COUNTRIES = new Set([
  // EU member states
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
  'FR','GR','HR','HU','IE','IT','LT','LU','LV','MT',
  'NL','PL','PT','RO','SE','SI','SK',
  // EEA (same GDPR obligations)
  'NO','IS','LI',
  // UK (retained GDPR post-Brexit)
  'GB',
])

export async function GET(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') ?? ''
  return NextResponse.json({ eu: EU_COUNTRIES.has(country.toUpperCase()), country })
}
