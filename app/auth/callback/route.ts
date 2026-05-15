import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      'https://mmwxbpqviqtitxptfiog.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1td3hicHF2aXF0aXR4cHRmaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjgwOTUsImV4cCI6MjA5NDEwNDA5NX0.tTUHcNpSaWzH6WkOm5wx4xT-W9f-qRv9_wDllbwZ2dU',
      { cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
      }}
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error or no code -> redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
