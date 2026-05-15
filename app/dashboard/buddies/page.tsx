'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchUserProfile } from '@/lib/supabase'

export default function BuddiesPage() {
  const [connections, setConnections] = useState<any[]>([])
  const [profile, setProfile]         = useState<any>(null)
  const [email, setEmail]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [sending, setSending]         = useState(false)
  const [msg, setMsg]                 = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('buddy_connections').select('*, buddy:buddy_id(email)').then(r => r.data || []),
      fetchUserProfile()
    ]).then(([conns, prof]) => { setConnections(conns); setProfile(prof); setLoading(false) })
  }, [])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault(); setSending(true); setMsg('')
    // Look up user by email
    const { data: user } = await supabase.from('user_profiles').select('id').eq('display_name', email).single()
    if (!user) { setMsg('User not found. They need a TracerBuddy account first.'); setSending(false); return }
    await supabase.from('buddy_connections').insert({ buddy_id: user.id, status: 'pending' })
    setMsg('Invite sent! ✅'); setSending(false); setEmail('')
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  const categories = [
    { label: 'Handicap',   icon: '#️⃣', value: profile?.handicap_index?.toFixed(1) ?? '—', color: '#FFD700' },
    { label: 'Best Round', icon: '⭐', value: '—',  color: '#00E578'  },
    { label: 'GIR %',      icon: '🚩', value: '—',  color: '#60A5FA'  },
    { label: 'Rounds',     icon: '📅', value: '—',  color: '#A855F7'  },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Buddy Battles</h1>
        <p className="text-gray-500 mt-1">Challenge your friends — who has the better game?</p>
      </div>

      {/* Your stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {categories.map(c => (
          <div key={c.label} className="card p-5 text-center">
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-3xl font-black" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-label mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Invite */}
      <div className="card p-6 mb-6">
        <div className="stat-label mb-4">INVITE A FRIEND</div>
        <form onSubmit={sendInvite} className="flex gap-3">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="friend@email.com"
            className="flex-1 bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/40"
          />
          <button type="submit" disabled={sending}
            className="bg-[#FFD700] text-black font-black px-6 py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50">
            {sending ? '...' : 'Invite'}
          </button>
        </form>
        {msg && <p className={`mt-3 text-sm ${msg.includes('✅') ? 'text-[#00E578]' : 'text-red-400'}`}>{msg}</p>}
      </div>

      {/* Connections */}
      <div className="card">
        <div className="stat-label p-5 border-b border-[#1F1F1F]">YOUR BUDDIES ({connections.length})</div>
        {connections.length === 0 ? (
          <div className="p-12 text-center text-gray-600">
            No buddies yet. Invite friends to start competing!
          </div>
        ) : connections.map((c: any) => (
          <div key={c.id} className="flex items-center gap-4 p-5 border-b border-[#1F1F1F] last:border-0">
            <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 flex items-center justify-center text-[#FFD700] font-black">
              {c.buddy?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white">{c.buddy?.email ?? 'Unknown'}</div>
              <div className={`text-xs ${c.status === 'accepted' ? 'text-[#00E578]' : 'text-yellow-400'}`}>
                {c.status === 'accepted' ? '● Connected' : '○ Pending'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
