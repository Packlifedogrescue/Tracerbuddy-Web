'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchUserProfile } from '@/lib/supabase'
import { Users, Send } from 'lucide-react'

export default function BuddiesPage() {
  const [connections, setConnections] = useState<any[]>([])
  const [profile, setProfile]         = useState<any>(null)
  const [rounds, setRounds]           = useState<any[]>([])
  const [email, setEmail]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [sending, setSending]         = useState(false)
  const [msg, setMsg]                 = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('buddy_connections').select('*, buddy:buddy_id(email)').then(r => r.data || []),
      fetchUserProfile(),
      supabase.from('rounds').select('total_score').order('created_at', { ascending: false }).limit(100).then(r => r.data || []),
    ]).then(([conns, prof, rds]) => {
      setConnections(conns)
      setProfile(prof)
      setRounds(rds)
      setLoading(false)
    })
  }, [])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setMsg('')
    const { data: user } = await supabase.from('user_profiles').select('id').eq('display_name', email).single()
    if (!user) {
      setMsg('User not found. They need a TracerBuddy account first.')
      setSending(false)
      return
    }
    await supabase.from('buddy_connections').insert({ buddy_id: user.id, status: 'pending' })
    setMsg('Invite sent!')
    setSending(false)
    setEmail('')
  }

  const bestRound = rounds.length ? Math.min(...rounds.map(r => r.total_score || 999)) : null
  const avgScore  = rounds.length ? Math.round(rounds.reduce((a, r) => a + (r.total_score || 0), 0) / rounds.length) : null

  const stats = [
    { label: 'Handicap',   value: profile?.handicap_index?.toFixed(1) ?? '—', color: '#C9A84C' },
    { label: 'Best Round', value: bestRound !== 999 && bestRound ? bestRound : '—',     color: '#22A06B' },
    { label: 'Avg Score',  value: avgScore ?? '—',                             color: '#111'    },
    { label: 'Rounds',     value: rounds.length,                                color: '#111'    },
  ]

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#111]">Buddy Battles</h1>
        <p className="text-gray-500 text-sm mt-0.5">Challenge your friends — who has the better game?</p>
      </div>

      {/* Your stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
            <div className="text-3xl font-black leading-none" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Invite */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">INVITE A FRIEND</div>
        <form onSubmit={sendInvite} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="friend@email.com"
            className="flex-1 bg-[#F8F4EE] border border-gray-200 rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] text-sm"
          />
          <button
            type="submit"
            disabled={sending || !email}
            className="bg-[#C9A84C] text-white font-black px-5 py-3 rounded-xl hover:bg-[#b8943e] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? '...' : 'Invite'}
          </button>
        </form>
        {msg && (
          <p className={`mt-3 text-sm font-semibold ${msg.includes('not found') ? 'text-red-400' : 'text-[#22A06B]'}`}>
            {msg}
          </p>
        )}
      </div>

      {/* Connections */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          YOUR BUDDIES ({connections.length})
        </div>
        {connections.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F8F4EE] flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">No buddies yet. Invite friends to start competing!</p>
          </div>
        ) : connections.map((c: any) => (
          <div key={c.id} className="flex items-center gap-4 p-5 border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-full bg-[#F8F4EE] flex items-center justify-center text-[#C9A84C] font-black text-sm shrink-0">
              {c.buddy?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[#111] truncate">{c.buddy?.email ?? 'Unknown'}</div>
              <div className={`text-xs font-semibold mt-0.5 ${c.status === 'accepted' ? 'text-[#22A06B]' : 'text-[#C9A84C]'}`}>
                {c.status === 'accepted' ? '● Connected' : '○ Pending'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
