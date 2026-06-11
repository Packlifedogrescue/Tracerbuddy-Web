'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { format, formatDistanceToNow } from 'date-fns'
import { Watch, Activity, Zap, Wifi, WifiOff, TrendingUp } from 'lucide-react'

export default function WatchPage() {
  const [swings,  setSwings]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('swing_data')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setSwings(data || []); setLoading(false) })
  }, [])

  const lastSync     = swings[0]?.recorded_at ?? null
  const avgSpeed     = swings.length ? (swings.reduce((a, s) => a + (s.swing_speed || 0), 0) / swings.length).toFixed(1) : '—'
  const maxSpeed     = swings.length ? Math.max(...swings.map(s => s.swing_speed || 0)) : 0
  const todaySwings  = swings.filter(s => new Date(s.recorded_at).toDateString() === new Date().toDateString())
  const connected    = lastSync && new Date(lastSync) > new Date(Date.now() - 24 * 3600000)
  const driverSwings = swings.filter(s => s.club === 'Driver')
  const avgDriver    = driverSwings.length
    ? (driverSwings.reduce((a, s) => a + (s.swing_speed || 0), 0) / driverSwings.length).toFixed(1)
    : '—'

  const trendData = [...swings].reverse().slice(-50).map(s => ({
    speed: s.swing_speed,
    date:  format(new Date(s.recorded_at), 'M/d'),
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

  const CHART = {
    tooltip: { background: 'white', border: '1px solid #E8E2D8', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    tick:    { fill: '#9CA3AF', fontSize: 10 },
  }

  const steps = [
    { num: 1, title: 'Install TracerBuddy Watch App',     body: 'Open the Watch app on your iPhone and install TracerBuddy.' },
    { num: 2, title: 'Wear Apple Watch on leading wrist', body: 'Left wrist for right-handed golfers, right wrist for left-handed.' },
    { num: 3, title: 'Start a round in the iPhone app',   body: 'Begin a round in TracerBuddy — swing detection starts automatically.' },
    { num: 4, title: 'Swing naturally',                   body: 'Every swing is captured. Speed and patterns are logged in real-time.' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-[#F0EAE0] border-t-[#C9A84C] animate-spin" />
    </div>
  )

  return (
    <div className="p-5 md:p-6 max-w-4xl space-y-4 pb-10">
      <div>
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">Apple Watch</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Swing speed tracking via Apple Watch motion sensors</p>
      </div>

      {/* Connection status */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
        connected ? 'bg-[#22A06B]/5 border-[#22A06B]/20' : 'bg-white border-gray-100 shadow-sm'
      }`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          connected ? 'bg-[#22A06B]/10' : 'bg-gray-100'
        }`}>
          {connected
            ? <Wifi className="w-6 h-6 text-[#22A06B]" />
            : <WifiOff className="w-6 h-6 text-gray-400" />}
        </div>
        <div className="flex-1">
          <div className={`text-[15px] font-bold ${connected ? 'text-[#22A06B]' : 'text-[#111]'}`}>
            {connected ? 'Watch Synced' : 'No Recent Sync'}
          </div>
          <div className="text-[13px] text-gray-500 mt-0.5">
            {lastSync
              ? `Last sync ${formatDistanceToNow(new Date(lastSync), { addSuffix: true })}`
              : 'No swing data received yet'}
          </div>
        </div>
        {connected && (
          <div className="text-right shrink-0">
            <div className="text-[#22A06B] font-black text-[24px] leading-none">{todaySwings.length}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Today</div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Avg Speed',   value: avgSpeed,        unit: 'mph',    icon: Activity,   color: '#C9A84C' },
          { label: 'Best Swing',  value: maxSpeed || '—', unit: 'mph',    icon: Zap,        color: '#22A06B' },
          { label: 'Avg Driver',  value: avgDriver,       unit: 'mph',    icon: TrendingUp, color: '#E87830' },
          { label: 'Total',       value: swings.length,   unit: 'swings', icon: Watch,      color: '#111'    },
        ].map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="w-8 h-8 rounded-xl bg-[#F8F4EE] flex items-center justify-center mx-auto mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</div>
            <div className="text-[26px] font-black leading-none" style={{ color }}>{value}</div>
            <div className="text-[11px] text-gray-400 mt-1">{unit}</div>
          </div>
        ))}
      </div>

      {swings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">How to Set Up</div>
          <div className="space-y-4">
            {steps.map(step => (
              <div key={step.num} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#F8F4EE] flex items-center justify-center text-[#C9A84C] font-black text-[13px] shrink-0">
                  {step.num}
                </div>
                <div className="pt-0.5">
                  <div className="text-[13.5px] font-bold text-[#111]">{step.title}</div>
                  <div className="text-[13px] text-gray-500 mt-0.5 leading-snug">{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Trend chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Swing Speed Trend</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                <XAxis dataKey="date" tick={CHART.tick} axisLine={false} tickLine={false} />
                <YAxis tick={CHART.tick} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={CHART.tooltip} labelStyle={{ color: '#666' }} itemStyle={{ color: '#C9A84C' }} />
                <Line type="monotone" dataKey="speed" stroke="#C9A84C" strokeWidth={2} dot={false} name="mph" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Speed by club */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Speed by Club</div>
              <div className="space-y-3.5">
                {clubAvgs.map(({ club, avg, count }) => (
                  <div key={club} className="flex items-center gap-4">
                    <div className="w-16 font-bold text-[#111] text-[13px] shrink-0">{club}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-[#F8F4EE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C9A84C] rounded-full transition-all"
                          style={{ width: `${maxSpeed > 0 ? (avg / maxSpeed) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right w-24 shrink-0">
                      <span className="text-[#111] font-black text-[13px]">{avg.toFixed(1)}</span>
                      <span className="text-gray-400 text-[11px] ml-1">mph ({count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent swings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-5 py-4 border-b border-gray-100">
                Recent Swings
              </div>
              <div className="overflow-y-auto max-h-[320px]">
                {swings.slice(0, 20).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-xl bg-[#F8F4EE] flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-[#C9A84C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#111]">{s.club || 'Unknown club'}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {format(new Date(s.recorded_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-[#C9A84C] text-[13px]">
                        {s.swing_speed ? `${s.swing_speed} mph` : '—'}
                      </div>
                      {s.swing_tempo && (
                        <div className="text-[11px] text-gray-400">{s.swing_tempo} tempo</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
