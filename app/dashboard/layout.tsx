'use client'
import type { ReactNode } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import UserInfo from '@/components/UserInfo'
import CommandPalette from '@/components/CommandPalette'
import NotificationBell from '@/components/NotificationBell'
import { Search } from 'lucide-react'
import { track } from '@/lib/analytics'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()

  // Auto page-view tracking on every navigation
  useEffect(() => {
    const page = pathname.replace('/dashboard', '') || 'home'
    track('page_view', { page })
  }, [pathname])

  // Cmd+K / Ctrl+K to open search
  const openSearch = useCallback(() => setSearchOpen(true), [])
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [openSearch])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5EFE0]">

      {/* ── Full-width header ── */}
      <header className="h-16 bg-white border-b border-[#EDE8DC] flex items-center pl-5 pr-6 gap-4 shrink-0 z-20 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">

        {/* Logo */}
        <div className="flex items-center w-[210px] shrink-0">
          <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-12 w-auto" />
        </div>

        {/* Search trigger */}
        <div className="flex-1 max-w-[340px]">
          <button
            onClick={openSearch}
            className="w-full flex items-center gap-2 bg-[#F8F5EE] border border-[#E8E2D8] rounded-lg px-3 h-9 cursor-pointer hover:border-[#D5CDBE] transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-[13px] text-gray-400 flex-1 text-left select-none">
              Search rounds, courses, or stats...
            </span>
            <kbd className="text-[10px] text-gray-400 bg-white border border-[#E8E2D8] rounded px-1.5 py-0.5 shrink-0 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: bell + user */}
        <div className="ml-auto flex items-center gap-2">

          <NotificationBell />

          <UserInfo />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-[#F5EFE0]">
          {children}
        </main>
      </div>

      {/* ── Command Palette ── */}
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
