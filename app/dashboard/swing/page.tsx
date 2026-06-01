'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Play } from 'lucide-react'
import Link from 'next/link'

export default function SwingPage() {
  const [swings, setSwings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('swing_data')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setSwings(data || []); setLoading(false) })
  }, [])

  const avgSpeed     = swings.length ? (swings.reduce((a,s) => a + (s.swing_speed||0), 0) / swings.length).toFixed(1) : '—'
  const maxSpeed     = swings.length ? Math.max(...swings.map(s => s.swing_speed||0)).toFixed(1) : '—'
  const driverSwings = swings.filter(s => s.club === 'Driver')
  const avgDriver    = driverSwings.length ? (driverSwings.reduce((a,s) => a + (s.swing_speed||0), 0) / driverSwings.length).toFixed(1) : '—'

  const trendData = [...swings].reverse().slice(-50).map((s, i) => ({
    i, speed: s.swing_speed, date: format(new Date(s.recorded_at), 'M/d'), club: s.club
  }))

  const byClub: Record<string, number[]> = {}
  swings.forEach(s => { if (s.club && s.swing_speed) { byClub[s.club] = byClub[s.club] || []; byClub[s.club].push(s.swing_speed) } })
  const clubAvgs = Object.entries(byClub)
    .map(([club, speeds]) => ({ club, avg: speeds.reduce((a,b) => a+b)/speeds.length, count: speeds.length }))
    .sort((a,b) => b.avg - a.avg)

  if (loading) return <div className="p-8 text-gray-500">Loading swing data...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Swing Data</h1>
          <p className="text-gray-500 mt-1">Apple Watch swing speed tracking — {swings.length} swings logged</p>
        </div>
        <Link
          href="/dashboard/swing/replay"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all hover:opacity-80"
          style={{ background: '#1a1a1a', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}
        >
          <Play className="w-4 h-4 fill-current" />
          Swing Replay
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-6 text-center">
          <div className="stat-label mb-2">AVG SPEED</div>
          <div className="text-4xl font-black text-[#FFD700]">{avgSpeed}</div>
          <div className="text-xs text-gray-500">mph</div>
        </div>
        <div className="card p-6 text-center">
          <div className="stat-label mb-2">BEST SWING</div>
          <div className="text-4xl font-black text-[#00E578]">{maxSpeed}</div>
          <div className="text-xs text-gray-500">mph</div>
        </div>
        <div className="card p-6 text-center">
          <div className="stat-label mb-2">AVG DRIVER</div>
          <div className="text-4xl font-black text-white">{avgDriver}</div>
          <div className="text-xs text-gray-500">mph</div>
        </div>
      </div>

      {swings.length === 0 ? (
        <div className="card p-16 text-center text-gray-600">
          <div className="text-5xl mb-4">⌚</div>
          No swing data yet. Wear your Apple Watch during rounds to track swing speed.
        </div>
      ) : (
        <>
          <div className="card p-6 mb-6">
            <div className="stat-label mb-4">SWING SPEED TREND</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                <XAxis dataKey="date" tick={{ fill:'#666', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#666', fontSize:10 }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                <Tooltip contentStyle={{ background:'#111', border:'1px solid #1F1F1F', borderRadius:8 }}
                         labelStyle={{ color:'#999' }} itemStyle={{ color:'#FFD700' }} />
                <Line type="monotone" dataKey="speed" stroke="#FFD700" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6 mb-6">
            <div className="stat-label mb-4">SPEED BY CLUB</div>
            <div className="space-y-3">
              {clubAvgs.map(({ club, avg, count }) => (
                <div key={club} className="flex items-center gap-4">
                  <div className="w-16 font-bold text-white text-sm">{club}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FFD700] rounded-full transition-all"
                        style={{ width: `${(avg / Number(maxSpeed)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-black">{avg.toFixed(1)}</span>
                    <span className="text-gray-500 text-xs ml-1">mph ({count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent swings — per-swing replay links */}
          <div className="card p-6">
            <div className="stat-label mb-4">RECENT SWINGS</div>
            <div className="space-y-1">
              {swings.slice(0, 20).map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-[13px]">{s.swing_speed ?? '—'} mph</span>
                      {s.club && (
                        <span className="text-[11px] text-gray-500 font-medium">{s.club}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">
                      {s.recorded_at ? format(new Date(s.recorded_at), 'MMM d, yyyy · h:mm a') : '—'}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/swing/replay?id=${s.id}`}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:opacity-80 shrink-0"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Replay
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
