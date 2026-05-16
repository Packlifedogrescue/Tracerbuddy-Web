'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, FileText, Map, Activity, Watch, Wrench,
  BarChart2, Settings2, Star, Gift, ChevronRight,
  Brain, Target, Dumbbell, Trophy, Users, Flag, X,
} from 'lucide-react'

const nav = [
  { href: '/dashboard',              icon: Home,      label: 'Dashboard'   },
  { href: '/dashboard/rounds',       icon: FileText,  label: 'Rounds'      },
  { href: '/dashboard/courses',      icon: Map,       label: 'Courses'     },
  { href: '/dashboard/swing',        icon: Activity,  label: 'SwingTrace'  },
  { href: '/dashboard/watch',        icon: Watch,     label: 'Apple Watch' },
  { href: '/dashboard/putting',      icon: Target,    label: 'Putting'     },
  { href: '/dashboard/clubs',        icon: Wrench,    label: 'Clubs'       },
  { href: '/dashboard/practice',     icon: Dumbbell,  label: 'Practice'    },
  { href: '/dashboard/coach',        icon: Brain,     label: 'AI Coach'    },
  { href: '/dashboard/goals',        icon: Flag,      label: 'Goals'       },
  { href: '/dashboard/tournament',   icon: Trophy,    label: 'Tournament'  },
  { href: '/dashboard/buddies',      icon: Users,     label: 'Buddies'     },
  { href: '/dashboard/stats',        icon: BarChart2, label: 'Insights'    },
  { href: '/dashboard/profile',      icon: Settings2, label: 'Settings'    },
]

function NavLinks({ path, onNav }: { path: string; onNav?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {nav.map(item => {
        const active = item.href === '/dashboard'
          ? path === '/dashboard'
          : path.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            onClick={onNav}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
              active
                ? 'bg-[#FEF3E8] text-[#E87830]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#111]'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#E87830]' : 'text-gray-400'}`} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  return (
    <>
      {/* Pro Plan */}
      <div className="px-3 pt-3 pb-2 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0 shadow-sm">
            <Star className="w-[15px] h-[15px] text-white fill-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-[#111]">Pro Plan</span>
              <span className="text-[11px] font-semibold text-[#C9A84C]">Active</span>
            </div>
            <Link href="/dashboard/profile" className="text-[11px] text-gray-400 leading-tight hover:text-[#C9A84C] transition-colors">
              Manage subscription
            </Link>
          </div>
        </div>
      </div>

      {/* Refer a friend */}
      <div className="px-3 pb-4 pt-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-[#FEF3E8] flex items-center justify-center shrink-0">
            <Gift className="w-3.5 h-3.5 text-[#E87830]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold text-[#111] leading-tight">Refer a friend</div>
            <div className="text-[11px] text-gray-400 leading-tight">Get 1 month free</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </div>
      </div>
    </>
  )
}

export default function Sidebar() {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[210px] bg-white border-r border-gray-100 flex-col shrink-0 overflow-y-auto">
        <NavLinks path={path} />
        <SidebarFooter />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100">
        <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-7 w-auto" style={{ mixBlendMode: 'multiply' }} />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="5" x2="16" y2="5" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="9" x2="16" y2="9" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="13" x2="16" y2="13" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-[260px] bg-white flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 shrink-0">
              <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-7 w-auto" style={{ mixBlendMode: 'multiply' }} />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <NavLinks path={path} onNav={() => setMobileOpen(false)} />
            <SidebarFooter />
          </div>
        </div>
      )}
    </>
  )
}
