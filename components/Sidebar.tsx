'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

export default function Sidebar({ name }: { name?: string }) {
  const path   = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const Links = () => (
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
      {nav.map(item => {
        const active = path === item.href
        return (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              active ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
                     : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <span>{item.icon}</span>{item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-60 min-h-screen bg-[#0D0D0D] border-r border-[#1F1F1F] flex-col shrink-0">
        <div className="px-6 py-5 border-b border-[#1F1F1F]">
          <div className="flex items-center">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-8 w-auto brightness-0 invert" />
          </div>
          {name && <p className="text-gray-500 text-xs mt-1 truncate">{name}</p>}
        </div>
        <Links />
        <div className="px-3 py-3 border-t border-[#1F1F1F]">
          <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-all">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0D0D0D] border-b border-[#1F1F1F]">
        <div className="flex items-center"><img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-7 w-auto brightness-0 invert" /></div>
        <button onClick={() => setOpen(!open)} className="text-white text-xl p-1">{open ? '✕' : '☰'}</button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#0D0D0D] border-r border-[#1F1F1F] flex flex-col pt-14" onClick={e => e.stopPropagation()}>
            <Links />
            <div className="px-3 py-3 border-t border-[#1F1F1F]">
              <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/5">
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
