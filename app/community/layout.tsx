import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata = { title: 'Community — TracerBuddy', description: 'Golf rounds, tips, and discussions from the TracerBuddy community.' }

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-8 w-auto" />
            </Link>
            <Link href="/community" className="text-[13px] font-semibold text-[#111] hidden sm:block">
              Community
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-[13px] text-[#555] hover:text-[#111] transition-colors hidden sm:block">
              Dashboard
            </Link>
            <Link href="/auth/login" className="text-[13px] font-semibold bg-[#DF9905] text-white px-4 py-1.5 rounded-lg hover:bg-[#A07509] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
