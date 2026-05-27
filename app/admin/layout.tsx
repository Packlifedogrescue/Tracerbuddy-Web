'use client'
import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Users, Flag, Map,
  LogOut, Shield, ChevronRight,
} from 'lucide-react'

const ADMIN_EMAIL = 'Brett@TracerBuddy.com'

const NAV = [
  { href: '/admin',         label: 'Overview',  icon: LayoutDashboard },
  { href: '/admin/users',   label: 'Users',     icon: Users           },
  { href: '/admin/rounds',  label: 'Rounds',    icon: Flag            },
  { href: '/admin/courses', label: 'Courses',   icon: Map             },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed,  setAllowed]  = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setAllowed(true)
      } else {
        router.replace('/dashboard')
      }
      setChecking(false)
    })
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!allowed) return null

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex">

      {/* Sidebar */}
      <aside className="w-56 bg-[#161616] border-r border-white/[0.06] flex flex-col shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-white/[0.06] gap-2.5">
          <Shield className="w-5 h-5 text-[#DF9905]" />
          <span className="text-white font-semibold text-sm tracking-wide">Admin</span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#DF9905]/15 text-[#DF9905]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-white/[0.06] flex items-center px-8">
          <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-9 w-auto opacity-90" />
          <span className="ml-3 text-[11px] font-semibold tracking-[0.15em] text-[#DF9905] uppercase bg-[#DF9905]/10 px-2 py-0.5 rounded">
            Admin
          </span>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
