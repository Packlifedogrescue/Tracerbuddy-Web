import type { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import { Search, Bell, ChevronDown } from 'lucide-react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5EFE0]">
      {/* ── Full-width top header ── */}
      <header className="h-14 bg-white border-b border-gray-100 flex items-center pl-5 pr-6 gap-4 shrink-0 z-20">
        {/* Logo zone — aligns with sidebar width */}
        <div className="flex items-center gap-2.5 w-[210px] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#111] flex items-center justify-center shrink-0 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7.5" stroke="#C9A84C" strokeWidth="1.5"/>
              <circle cx="10" cy="10" r="3" fill="#C9A84C"/>
              <line x1="10" y1="2.5" x2="10" y2="5.5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="14.5" x2="10" y2="17.5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="2.5" y1="10" x2="5.5" y2="10" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="14.5" y1="10" x2="17.5" y2="10" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-black text-[15px] tracking-tight text-[#111]">TracerBuddy</span>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-[340px]">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 h-9 cursor-pointer hover:border-gray-300 transition-colors">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-[13px] text-gray-400 flex-1 select-none">
              Search rounds, courses, or stats...
            </span>
            <kbd className="text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 shrink-0 font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: notification + user */}
        <div className="ml-auto flex items-center gap-2">
          <button className="relative w-9 h-9 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors">
            <Bell className="w-[18px] h-[18px] text-gray-500" />
            <span className="absolute top-[9px] right-[9px] w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors ml-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#9B8165] to-[#5D4037] flex items-center justify-center text-white text-[12px] font-bold shrink-0 border-[2.5px] border-white shadow-sm">
              BW
            </div>
            <div className="hidden sm:block">
              <div className="text-[13px] font-semibold text-[#111] leading-tight">Brett Williams</div>
              <div className="text-[11px] text-gray-500 leading-tight">Handicap 7.2</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + main ── */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-[#F5EFE0]">
          {children}
        </main>
      </div>
    </div>
  )
}
