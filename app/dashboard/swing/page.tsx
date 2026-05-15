'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Activity, Zap, TrendingUp } from 'lucide-react'

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

  const avgSpeed     = swings.length ? (swings.reduce((a, s) => a + (s.swing_speed || 0), 0) / swings.length).toFixed(1) : '—'
  const maxSpeed     = swings.length ? Math.max(...swings.map(s => s.swing_speed || 0)).toFixed(1) : '—'
  const driverSwings = swings.filter(s => s.club === 'Driver')
  const avgDriver    = driverSwings.length ? (driverSwings.reduce((a, s) => a + (s.swing_speed || 0), 0) / driverSwings.length).toFixed(1) : '—'

  const trendData = [...swings].reverse().slice(-50).map((s) => ({
    speed: s.swing_speed,
    date:  format(new Date(s.recorded_at), 'M/d'),
    club:  s.club,
  }))

  const byClub: Record<string, number[]> = {}
  swings.forEach(s => {
    if (s.club && s.swing_speed) {
      byClub[s.club] = byClub[s.club] || []
      byClub[s.club].push(s.swing_speed)
    }
  })
  const clubAvgs = Object.entries(byClub)
    .map(([club, speeds]) => ({ club, avg: speeds.reduce((a, b) => a + b) / speeds.length, count: speeds.length }))
    .sort((a, b) => b.avg - a.avg)

  if (loading) return <div className="p-8 text-gray-400">Loading swing data...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#111]">SwingTrace</h1>
        <p className="text-gray-500 text-sm mt-0.5">Apple Watch swing speed — {swings.length} swings logged</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'AVG SPEED',   value: avgSpeed,  unit: 'mph', icon: Activity,   color: '#C9A84C' },
          { label: 'BEST SWING',  value: maxSpeed,  unit: 'mph', icon: Zap,        color: '#22A06B' },
          { label: 'AVG DRIVER',  value: avgDriver, unit: 'mph', icon: TrendingUp, color: '#111'    },
        ].map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</div>
            <div className="text-4xl font-black leading-none" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-400 mt-1">{unit}</div>
          </div>
        ))}
      </div>

      {swings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <Activity className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No swing data yet. Wear your Apple Watch during rounds to track swing speed.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">SWING SPEED TREND</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                <XAxis dataKey="date" tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#666' }}
                  itemStyle={{ color: '#C9A84C' }}
                />
                <Line type="monotone" dataKey="speed" stroke="#C9A84C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">SPEED BY CLUB</div>
            <div className="space-y-3">
              {clubAvgs.map(({ club, avg, count }) => (
                <div key={club} className="flex items-center gap-4">
                  <div className="w-16 font-bold text-[#111] text-sm">{club}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-[#F8F4EE] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C9A84C] rounded-full transition-all"
                        style={{ width: `${(avg / Number(maxSpeed)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#111] font-black text-sm">{avg.toFixed(1)}</span>
                    <span className="text-gray-400 text-xs ml-1">mph ({count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
