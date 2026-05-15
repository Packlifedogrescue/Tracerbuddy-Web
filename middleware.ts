import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    'https://mmwxbpqviqtitxptfiog.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1td3hicHF2aXF0aXR4cHRmaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjgwOTUsImV4cCI6MjA5NDEwNDA5NX0.tTUHcNpSaWzH6WkOm5wx4xT-W9f-qRv9_wDllbwZ2dU',
    { cookies: {
      get(name: string) { return request.cookies.get(name)?.value },
      set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }) },
      remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: '', ...options }) },
    }}
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  if (request.nextUrl.pathname.startsWith('/auth') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
