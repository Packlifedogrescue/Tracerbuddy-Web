'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, formatDistanceToNow } from 'date-fns'
import { Watch, Activity, Zap, Heart, Wifi, WifiOff } from 'lucide-react'

export default function WatchPage() {
  const [swings, setSwings]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('swing_data')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setSwings(data || []); setLoading(false) })
  }, [])

  const lastSync     = swings[0]?.recorded_at ?? null
  const avgSpeed     = swings.length ? (swings.reduce((a, s) => a + (s.swing_speed || 0), 0) / swings.length).toFixed(1) : '—'
  const maxSpeed     = swings.length ? Math.max(...swings.map(s => s.swing_speed || 0)) : 0
  const todaySwings  = swings.filter(s => new Date(s.recorded_at).toDateString() === new Date().toDateString())
  const connected    = lastSync && new Date(lastSync) > new Date(Date.now() - 24 * 3600000)

  const steps = [
    { num: 1, title: 'Install TracerBuddy Watch App',   body: 'Open the Watch app on your iPhone and install TracerBuddy from the App Store.' },
    { num: 2, title: 'Wear your Apple Watch',           body: 'Wear your Apple Watch on your leading wrist during your round.' },
    { num: 3, title: 'Start round in TracerBuddy app',  body: 'Begin a round in the iPhone app — swing detection starts automatically.' },
    { num: 4, title: 'Swing naturally',                 body: 'Every swing is captured. Speed, tempo, and patterns are logged in real-time.' },
  ]

  if (loading) return <div className="p-8 text-gray-400">Loading watch data...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#111]">Apple Watch</h1>
        <p className="text-gray-500 text-sm mt-0.5">Swing speed tracking via Apple Watch motion sensors</p>
      </div>

      {/* Connection status */}
      <div className={`rounded-2xl border p-5 mb-6 flex items-center gap-4 ${
        connected ? 'bg-[#22A06B]/5 border-[#22A06B]/20' : 'bg-[#F8F4EE] border-gray-100'
      }`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          connected ? 'bg-[#22A06B]/10' : 'bg-gray-100'
        }`}>
          {connected ? <Wifi className="w-6 h-6 text-[#22A06B]" /> : <WifiOff className="w-6 h-6 text-gray-400" />}
        </div>
        <div className="flex-1">
          <div className={`font-bold text-base ${connected ? 'text-[#22A06B]' : 'text-[#111]'}`}>
            {connected ? 'Watch Synced' : 'No Recent Sync'}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {lastSync
              ? `Last sync ${formatDistanceToNow(new Date(lastSync), { addSuffix: true })}`
              : 'No swing data received yet'}
          </div>
        </div>
        {connected && (
          <div className="text-right shrink-0">
            <div className="text-[#22A06B] font-black text-lg">{todaySwings.length}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Today</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'AVG SPEED',  value: avgSpeed,          unit: 'mph', icon: Activity, color: '#C9A84C' },
          { label: 'BEST SWING', value: maxSpeed || '—',   unit: 'mph', icon: Zap,      color: '#22A06B' },
          { label: 'TOTAL',      value: swings.length,     unit: 'swings', icon: Watch, color: '#111'    },
        ].map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="w-8 h-8 rounded-xl bg-[#F8F4EE] flex items-center justify-center mx-auto mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</div>
            <div className="text-3xl font-black leading-none" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-400 mt-1">{unit}</div>
          </div>
        ))}
      </div>

      {swings.length === 0 ? (
        /* Setup guide */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">HOW TO SET UP</div>
          <div className="space-y-4">
            {steps.map(step => (
              <div key={step.num} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#F8F4EE] flex items-center justify-center text-[#C9A84C] font-black text-sm shrink-0">
                  {step.num}
                </div>
                <div className="pt-0.5">
                  <div className="font-bold text-[#111] text-sm">{step.title}</div>
                  <div className="text-sm text-gray-500 mt-0.5 leading-snug">{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Recent swings */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-5 py-4 border-b border-gray-100">
            RECENT SWINGS
          </div>
          {swings.slice(0, 20).map((s: any) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0">
              <div className="w-10 h-10 rounded-xl bg-[#F8F4EE] flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-[#C9A84C]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#111] text-sm">{s.club || 'Unknown club'}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(s.recorded_at), 'MMM d, h:mm a')}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-[#C9A84C]">{s.swing_speed ? `${s.swing_speed} mph` : '—'}</div>
                {s.swing_tempo && (
                  <div className="text-xs text-gray-400">{s.swing_tempo} tempo</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
