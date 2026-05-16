'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchUserProfile } from '@/lib/supabase'
import { Users, Send, Clock, Check } from 'lucide-react'

export default function BuddiesPage() {
  const [connections, setConnections] = useState<any[]>([])
  const [profile,     setProfile]     = useState<any>(null)
  const [rounds,      setRounds]      = useState<any[]>([])
  const [email,       setEmail]       = useState('')
  const [loading,     setLoading]     = useState(true)
  const [sending,     setSending]     = useState(false)
  const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('buddy_connections')
        .select('*, buddy:buddy_id(email, display_name)')
        .then(r => r.data || []),
      fetchUserProfile(),
      supabase.from('rounds')
        .select('total_score')
        .order('created_at', { ascending: false })
        .limit(100)
        .then(r => r.data || []),
    ]).then(([conns, prof, rds]) => {
      setConnections(conns)
      setProfile(prof)
      setRounds(rds)
      setLoading(false)
    })
  }, [])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setMsg(null)
    const { data: user } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .eq('email', email.toLowerCase().trim())
      .single()
    if (!user) {
      setMsg({ text: 'No TracerBuddy account found for that email.', ok: false })
      setSending(false)
      return
    }
    const { error } = await supabase
      .from('buddy_connections')
      .insert({ buddy_id: user.id, status: 'pending' })
    if (error) {
      setMsg({ text: 'Could not send invite. Already connected?', ok: false })
    } else {
      setMsg({ text: `Invite sent to ${user.display_name || email}!`, ok: true })
      setEmail('')
    }
    setSending(false)
  }

  const validScores = rounds.filter(r => r.total_score).map(r => r.total_score)
  const bestRound   = validScores.length ? Math.min(...validScores) : null
  const avgScore    = validScores.length ? Math.round(validScores.reduce((a, v) => a + v, 0) / validScores.length) : null

  const stats = [
    { label: 'Handicap',   value: profile?.handicap_index != null ? Number(profile.handicap_index).toFixed(1) : '—', color: '#C9A84C' },
    { label: 'Best Round', value: bestRound ?? '—', color: '#22A06B' },
    { label: 'Avg Score',  value: avgScore  ?? '—', color: '#111'    },
    { label: 'Rounds',     value: rounds.length,    color: '#111'    },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading…</div>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">Buddy Battles</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Challenge your friends — who has the better game?</p>
      </div>

      {/* Your stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
            <div className="text-[32px] font-black leading-none" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Invite */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-[13.5px] font-bold text-[#111]">Invite a Friend</span>
        </div>
        <form onSubmit={sendInvite} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="friend@email.com"
            className="flex-1 bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] text-[14px] transition"
          />
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="bg-[#C9A84C] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#A07828] disabled:opacity-50 transition-colors flex items-center gap-2 text-[13.5px]"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : 'Invite'}
          </button>
        </form>
        {msg && (
          <p className={`mt-3 text-[13px] font-semibold flex items-center gap-1.5 ${msg.ok ? 'text-[#22A06B]' : 'text-red-400'}`}>
            {msg.ok ? <Check className="w-3.5 h-3.5" /> : null}
            {msg.text}
          </p>
        )}
        <p className="text-[11.5px] text-gray-400 mt-2">They must already have a TracerBuddy account.</p>
      </div>

      {/* Connections list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Your Buddies ({connections.length})
          </span>
        </div>
        {connections.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F8F4EE] flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-[14px] font-semibold text-[#111] mb-1">No buddies yet</p>
            <p className="text-[13px] text-gray-400">Invite friends to start competing!</p>
          </div>
        ) : connections.map((c: any) => {
          const name    = c.buddy?.display_name || c.buddy?.email || 'Unknown'
          const initial = name[0]?.toUpperCase() ?? '?'
          const pending = c.status !== 'accepted'
          return (
            <div key={c.id} className="flex items-center gap-4 p-5 border-b border-gray-50 last:border-0">
              <div className="w-10 h-10 rounded-full bg-[#F8F4EE] flex items-center justify-center text-[#C9A84C] font-black text-[15px] shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[#111] truncate">{name}</div>
                {c.buddy?.email && name !== c.buddy.email && (
                  <div className="text-[11.5px] text-gray-400 mt-0.5">{c.buddy.email}</div>
                )}
              </div>
              <div className={`flex items-center gap-1.5 text-[12px] font-semibold ${
                pending ? 'text-[#C9A84C]' : 'text-[#22A06B]'
              }`}>
                {pending ? <Clock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {pending ? 'Pending' : 'Connected'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
