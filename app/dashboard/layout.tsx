import type { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import UserInfo from '@/components/UserInfo'
import { Search, Bell } from 'lucide-react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5EFE0]">

      {/* ── Full-width header ── */}
      <header className="h-14 bg-white border-b border-[#EDE8DC] flex items-center pl-5 pr-6 gap-4 shrink-0 z-20 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">

        {/* Logo — matches sidebar width */}
        <div className="flex items-center gap-2.5 w-[210px] shrink-0">
          {/* Target/tracer icon — no dark box */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#C9A84C" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="5.5" stroke="#C9A84C" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="2.5" fill="#C9A84C"/>
          </svg>
          <span className="font-black text-[15px] tracking-tight text-[#111]">TracerBuddy</span>
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

        {/* Right: bell + live user info */}
        <div className="ml-auto flex items-center gap-2">
          <button className="relative w-9 h-9 rounded-full hover:bg-[#F5EFE0] flex items-center justify-center transition-colors">
            <Bell className="w-[18px] h-[18px] text-gray-500" />
            <span className="absolute top-[9px] right-[9px] w-2 h-2 bg-[#C9A84C] rounded-full border-2 border-white" />
          </button>
          {/* Client component — fetches real user name from Supabase */}
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
