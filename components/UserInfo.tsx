'use client'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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

  const parts    = name.trim().split(/\s+/)
  const initials = parts.map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#9B8165] to-[#6D4C41] flex items-center justify-center text-white text-[12px] font-bold shrink-0 border-[2.5px] border-white shadow-sm">
        {initials}
      </div>
      <div className="hidden sm:block">
        <div className="text-[13px] font-semibold text-[#111] leading-tight">{name}</div>
        <div className="text-[11px] text-gray-400 leading-tight">
          {handicap !== null ? `Handicap ${handicap}` : 'TracerBuddy'}
        </div>
      </div>
      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
    </div>
  )
}
