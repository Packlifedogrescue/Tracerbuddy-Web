'use client'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function UserInfo() {
  const [name, setName]         = useState('')
  const [handicap, setHandicap] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: { user } }, { data: profile }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('user_profiles').select('display_name, handicap_index').single(),
      ])
      const resolved =
        (profile as any)?.display_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        ''
      setName(resolved)
      const hi = (profile as any)?.handicap_index
      if (hi != null) setHandicap(parseFloat(hi.toFixed(1)))
    }
    load()
  }, [])

  const initials = name
    ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#9B8165] to-[#6D4C41] flex items-center justify-center text-white text-[12px] font-bold shrink-0 border-[2.5px] border-white shadow-sm">
        {initials || '⛳'}
      </div>
      {name && (
        <div className="hidden sm:block">
          <div className="text-[13px] font-semibold text-[#111] leading-tight">{name}</div>
          {handicap !== null && (
            <div className="text-[11px] text-gray-500 leading-tight">Handicap {handicap}</div>
          )}
        </div>
      )}
      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
    </div>
  )
}
