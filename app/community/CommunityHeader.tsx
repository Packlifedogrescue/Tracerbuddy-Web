'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function CommunityHeader() {
  const [user, setUser]   = useState<{ name: string } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', data.user.id)
          .single()
        setUser({ name: profile?.display_name ?? data.user.email?.split('@')[0] ?? 'Golfer' })
      }
      setReady(true)
    })
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-black/[0.06] shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-8">
          <Link href="/">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-10 w-auto" />
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/community" className="text-[13px] font-semibold text-[#111] border-b-2 border-[#DF9905] pb-0.5">
              Community
            </Link>
          </nav>
        </div>

        {/* Right: auth-aware */}
        <div className="flex items-center gap-3">
          {ready && (
            user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-[13px] text-[#555]">
                  <div className="w-7 h-7 rounded-full bg-[#0D2818] flex items-center justify-center text-white text-[11px] font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-[#111]">{user.name.split(' ')[0]}</span>
                </div>
                <Link
                  href="/dashboard"
                  className="text-[13px] font-semibold bg-[#111] text-white px-4 py-1.5 rounded-lg hover:bg-[#333] transition-colors"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-[13px] text-[#555] font-medium hover:text-[#111] transition-colors hidden sm:block">
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-[13px] font-semibold bg-[#DF9905] text-white px-4 py-1.5 rounded-lg hover:bg-[#A07509] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </header>
  )
}
