'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase, fetchRounds, fetchHandicapHistory, fetchUserProfile } from '@/lib/supabase'
import { format } from 'date-fns'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<any>(null)
  const [rounds, setRounds]     = useState<any[]>([])
  const [handicap, setHandicap] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth/login'); return }
      loadData()
    })
  }, [])

  async function loadData() {
    const [p, r, h] = await Promise.all([
      fetchUserProfile(),
      fetchRounds(10),
      fetchHandicapHistory(),
    ])
    setProfile(p); setRounds(r)
    setHandicap(h.map((x: any) => ({
      date: format(new Date(x.recorded_at), 'MMM d'),
      handicap: parseFloat(x.handicap?.toFixed(1))
    })))
    setLoading(false)
  }

  const avgScore = rounds.length
    ? Math.round(rounds.reduce((a, r) => a + (r.total_score || 0), 0) / rounds.length)
    : 0
  const bestRound = rounds.reduce((best, r) => (!best || r.total_score < best) ? r.total_score : best, null)
  const avgGIR = rounds.length
    ? Math.round(rounds.reduce((a, r) => a + (r.gir_count || 0), 0) / rounds.length)
    : 0
  const avgPutts = rounds.length
    ? (rounds.reduce((a, r) => a + (r.putts || 0), 0) / rounds.length).toFixed(1)
    : 0

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="text-4xl mb-4">⛳</div>
        <p className="text-gray-500">Loading your stats...</p>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">
            Welcome back{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's how your game is looking</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black text-[#FFD700]">
            {profile?.handicap_index?.toFixed(1) ?? '—'}
          </div>
          <div className="stat-label">HANDICAP</div>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'ROUNDS', value: rounds.length, color: 'text-white' },
          { label: 'AVG SCORE', value: avgScore || '—', color: 'text-white' },
          { label: 'BEST ROUND', value: bestRound || '—', color: 'text-[#FFD700]' },
          { label: 'AVG GIR', value: avgGIR ? `${avgGIR}/18` : '—', color: 'text-[#00E578]' },
        ].map(s => (
          <div key={s.label} className="card p-6">
            <div className="stat-label mb-2">{s.label}</div>
            <div className={`text-4xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Handicap trend */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="stat-label mb-1">HANDICAP TREND</div>
              <div className="font-black text-white text-lg">
                {handicap.length >= 2
                  ? `${(handicap[0].handicap - handicap[handicap.length-1].handicap).toFixed(1) > '0'
                      ? '↓ Improving'
                      : '↑ Working on it'}`
                  : 'Keep playing to see trend'}
              </div>
            </div>
            <div className="text-3xl font-black text-[#FFD700]">
              {handicap[handicap.length-1]?.handicap ?? '—'}
            </div>
          </div>
          {handicap.length >= 3 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={handicap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} reversed />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #1F1F1F', borderRadius: 8 }}
                  labelStyle={{ color: '#999' }}
                  itemStyle={{ color: '#FFD700' }}
                />
                <Line type="monotone" dataKey="handicap" stroke="#FFD700" strokeWidth={2.5}
                  dot={{ fill: '#FFD700', strokeWidth: 0, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-600">
              Complete more rounds to see your trend
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="card p-6 space-y-4">
          <div className="stat-label mb-4">THIS SEASON</div>
          {[
            { label: 'Avg Putts/Round', value: avgPutts, icon: '⛳' },
            { label: 'Home Course',     value: profile?.home_course || 'Not set', icon: '📍' },
            { label: 'Rounds Tracked',  value: rounds.length, icon: '📋' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 py-3 border-b border-[#1F1F1F] last:border-0">
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="font-bold text-white">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent rounds */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-[#1F1F1F]">
          <div className="font-black text-white">Recent Rounds</div>
          <Link href="/dashboard/rounds" className="text-[#FFD700] text-sm font-bold hover:text-yellow-400">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-[#1F1F1F]">
          {rounds.length === 0 ? (
            <div className="p-12 text-center text-gray-600">
              <div className="text-4xl mb-3">🏌️</div>
              No rounds yet. Start tracking in the app!
            </div>
          ) : rounds.slice(0,6).map((r: any) => (
            <Link key={r.id} href={`/dashboard/rounds/${r.id}`}
              className="flex items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors">
              {/* Date */}
              <div className="w-14 text-center">
                <div className="text-xs text-gray-500">{format(new Date(r.created_at), 'MMM')}</div>
                <div className="text-2xl font-black text-white">{format(new Date(r.created_at), 'd')}</div>
              </div>
              {/* Course */}
              <div className="flex-1">
                <div className="font-bold text-white">{r.course_name || 'Unknown Course'}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {r.gir_count ?? 0} GIR · {r.putts ?? 0} putts · {r.shot_count ?? 0} shots
                </div>
              </div>
              {/* Score */}
              <div className="text-right">
                <div className="text-3xl font-black text-white">{r.total_score}</div>
                <div className="text-xs text-gray-500">
                  {r.handicap_differential ? `+${r.handicap_differential.toFixed(1)} diff` : ''}
                </div>
              </div>
              <span className="text-gray-600">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
