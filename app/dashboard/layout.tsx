'use client'
import type { ReactNode } from 'react'
import { useRef, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import UserInfo from '@/components/UserInfo'
import { Search, Bell } from 'lucide-react'
import { track } from '@/lib/analytics'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Auto page-view tracking on every navigation
  useEffect(() => {
    const page = pathname.replace('/dashboard', '') || 'home'
    track('page_view', { page })
  }, [pathname])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5EFE0]">

      {/* ── Full-width header ── */}
      <header className="h-16 bg-white border-b border-[#EDE8DC] flex items-center pl-5 pr-6 gap-4 shrink-0 z-20 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">

        {/* Logo */}
        <div className="flex items-center w-[210px] shrink-0">
          <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-12 w-auto" />
        </div>

        {/* Search */}
        <div className="flex-1 max-w-[340px]">
          <div className="flex items-center gap-2 bg-[#F8F5EE] border border-[#E8E2D8] rounded-lg px-3 h-9 cursor-pointer hover:border-[#D5CDBE] transition-colors">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-[13px] text-gray-400 flex-1 select-none">
              Search rounds, courses, or stats...
            </span>
            <kbd className="text-[10px] text-gray-400 bg-white border border-[#E8E2D8] rounded px-1.5 py-0.5 shrink-0 font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: bell + user */}
        <div className="ml-auto flex items-center gap-2">

          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen(o => !o)}
              className="relative w-9 h-9 rounded-full hover:bg-[#F5EFE0] flex items-center justify-center transition-colors"
            >
              <Bell className="w-[18px] h-[18px] text-gray-500" />
              <span className="absolute top-[9px] right-[9px] w-2 h-2 bg-[#DF9905] rounded-full border-2 border-white" />
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-[13px] font-semibold text-[#111]">Notifications</span>
                  <span className="text-[11px] text-[#DF9905] font-semibold cursor-pointer hover:underline">Mark all read</span>
                </div>
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-[13px] text-gray-400">No notifications yet</p>
                  <p className="text-[11px] text-gray-300 mt-1">We'll let you know when something happens</p>
                </div>
              </div>
            )}
          </div>

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
    </div>
  )
}
