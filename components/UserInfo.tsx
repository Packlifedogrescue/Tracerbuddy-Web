'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function isEmail(s: string) { return s.includes('@') }

function bestName(
  profileDisplay: string | null | undefined,
  metaDisplay:    string | null | undefined,
  metaFull:       string | null | undefined,
  metaName:       string | null | undefined,
): string {
  const candidates = [profileDisplay, metaDisplay, metaFull, metaName]
  for (const c of candidates) {
    if (c && c.trim() && !isEmail(c)) return c.trim()
  }
  return ''
}

export default function UserInfo() {
  const [name,     setName]     = useState('')
  const [handicap, setHandicap] = useState<number | null>(null)
  const [open,     setOpen]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const [{ data: { user } }, { data: profile }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('user_profiles').select('display_name, handicap_index').maybeSingle(),
      ])
      const m    = user?.user_metadata ?? {}
      const full = bestName(
        (profile as any)?.display_name,
        m.display_name,
        m.full_name,
        m.name,
      )
      setName(full || 'Golfer')
      const hi = (profile as any)?.handicap_index
      if (hi != null) setHandicap(parseFloat(Number(hi).toFixed(1)))
    }
    load()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const parts    = name.trim().split(/\s+/)
  const initials = parts.map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#9B8165] to-[#6D4C41] flex items-center justify-center text-white text-[12px] font-bold shrink-0 border-[2.5px] border-white shadow-sm">
          {initials}
        </div>
        <div className="hidden sm:block">
          <div className="text-[13px] font-semibold text-[#111] leading-tight">{name}</div>
          <div className="text-[11px] text-gray-400 leading-tight">
            {handicap !== null ? `Handicap ${handicap}` : 'TracerBuddy'}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-[13px] font-semibold text-[#111]">{name}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {handicap !== null ? `Handicap ${handicap}` : 'TracerBuddy Member'}
            </div>
          </div>
          <div className="py-1.5">
            <Link href="/dashboard/profile" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#333] hover:bg-gray-50 transition-colors">
              <User className="w-4 h-4 text-gray-400" /> Profile
            </Link>
            <Link href="/dashboard/profile" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#333] hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4 text-gray-400" /> Settings
            </Link>
          </div>
          <div className="border-t border-gray-100 py-1.5">
            <button onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
