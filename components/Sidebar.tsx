'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, ListOrdered, BarChart2, Watch, MoreHorizontal, X, ChevronRight } from 'lucide-react'

const nav = [
  { href: '/dashboard',            icon: '🏠', label: 'Dashboard'        },
  { href: '/dashboard/rounds',     icon: '📋', label: 'Rounds'           },
  { href: '/dashboard/stats',      icon: '📊', label: 'Stats'            },
  { href: '/dashboard/clubs',      icon: '🏌️', label: 'Club Confidence' },
  { href: '/dashboard/putting',    icon: '⛳', label: 'PuttBuddy'        },
  { href: '/dashboard/coach',      icon: '🧠', label: 'Coach Cards'      },
  { href: '/dashboard/shots',      icon: '🗺️', label: 'Shot Shapes'      },
  { href: '/dashboard/swing',      icon: '⌚', label: 'Swing Data'       },
  { href: '/dashboard/practice',   icon: '🎯', label: 'Practice'         },
  { href: '/dashboard/tournament', icon: '🏆', label: 'Tournaments'      },
  { href: '/dashboard/buddies',    icon: '👥', label: 'Buddy Battles'    },
  { href: '/dashboard/progress',   icon: '📈', label: 'My Progress'      },
  { href: '/dashboard/goals',      icon: '🎯', label: 'Goals'            },
  { href: '/dashboard/profile',    icon: '⚙️', label: 'Profile'          },
]

// Primary items shown in the bottom tab bar
const tabItems = [
  { href: '/dashboard',        Icon: LayoutDashboard, label: 'Home'   },
  { href: '/dashboard/rounds', Icon: ListOrdered,     label: 'Rounds' },
  { href: '/dashboard/stats',  Icon: BarChart2,        label: 'Stats'  },
  { href: '/dashboard/swing',  Icon: Watch,            label: 'Swing'  },
]

export default function Sidebar({ name }: { name?: string }) {
  const path   = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const NavLinks = () => (
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
      {nav.map(item => {
        const active = path === item.href
        return (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              active ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
                     : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <span>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {active && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 min-h-screen bg-[#0D0D0D] border-r border-[#1F1F1F] flex-col shrink-0">
        <div className="px-6 py-5 border-b border-[#1F1F1F]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⛳</span>
            <span className="font-black text-lg">TracerBuddy</span>
          </div>
          {name && <p className="text-gray-500 text-xs mt-1 truncate">{name}</p>}
        </div>
        <NavLinks />
        <div className="px-3 py-3 border-t border-[#1F1F1F]">
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-all">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: '#0D0D0D',
          borderTop: '1px solid #1F1F1F',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {tabItems.map(({ href, Icon, label }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all"
              style={{ color: active ? '#FFD700' : '#555' }}>
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
            </Link>
          )
        })}
        {/* More button */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all"
          style={{ color: open ? '#FFD700' : '#555' }}>
          <MoreHorizontal className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[10px] font-bold tracking-wide">More</span>
        </button>
      </div>

      {/* ── Mobile slide-up drawer (full nav) ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#0D0D0D] rounded-t-2xl flex flex-col"
            style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* Handle */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1F1F] shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⛳</span>
                <span className="font-black text-white">TracerBuddy</span>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1F1F1F] flex items-center justify-center">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <NavLinks />
            <div className="px-3 py-3 border-t border-[#1F1F1F] shrink-0">
              <button onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
