'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/lib/useRealtime'
import { format } from 'date-fns'
import { Gauge, Zap, Target, Wind } from 'lucide-react'
import ProGate from '@/components/ProGate'
import LiveBadge from '@/components/LiveBadge'

// Range Lab launch-monitor shots (lm_shots, written by the iOS RangeLab — see
// SupabaseShotStore.swift). Metrics are stored in SI units; golfers read mph / yards / feet.
const MS_TO_MPH = 2.23694
const M_TO_YD   = 1.09361
const M_TO_FT   = 3.28084

export default function RangeLabPage() {
  const [shots,   setShots]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    supabase.from('lm_shots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setShots(data || []); setLoading(false) })
  }
  useEffect(load, [])
  const live = useRealtime(['lm_shots'], load)

  const avg = (vals: any[]) => {
    const v = vals.filter(x => x != null && !isNaN(x) && x > 0)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const fmt = (v: number | null, digits = 0) => v == null ? '—' : v.toFixed(digits)

  const avgBall  = avg(shots.map(s => (s.ball_speed_ms ?? 0) * MS_TO_MPH))
  const avgCarry = avg(shots.map(s => (s.carry_m ?? 0) * M_TO_YD))
  const avgSpin  = avg(shots.map(s => s.spin_rpm))
  const avgSmash = avg(shots.map(s => s.smash_factor))

  const trendData = [...shots].reverse().slice(-50).map(s => ({
    carry: s.carry_m ? +(s.carry_m * M_TO_YD).toFixed(0) : null,
    date:  format(new Date(s.created_at), 'M/d'),
  }))

  const CHART = {
    tooltip: { background: 'white', border: '1px solid #E8E2D8', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    tick:    { fill: '#9CA3AF', fontSize: 10 },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading Range Lab shots…</div>
    </div>
  )

  return (
    <ProGate feature="Range Lab" description="Your on-device launch monitor — ball speed, spin, launch angle, carry and smash factor from every Range Lab shot, live.">
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-black text-[#111] tracking-tight">Range Lab</h1>
          <LiveBadge live={live} />
        </div>
        <p className="text-[13.5px] text-gray-400 mt-0.5">On-device launch monitor — {shots.length} shot{shots.length === 1 ? '' : 's'} captured</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Avg Ball Speed', value: fmt(avgBall, 1),  unit: 'mph', icon: Zap,    color: '#C9A84C' },
          { label: 'Avg Carry',      value: fmt(avgCarry),    unit: 'yds', icon: Target, color: '#22A06B' },
          { label: 'Avg Spin',       value: fmt(avgSpin),     unit: 'rpm', icon: Wind,   color: '#111'    },
          { label: 'Avg Smash',      value: fmt(avgSmash, 2), unit: '',    icon: Gauge,  color: '#E87830' },
        ].map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5 text-center">
            <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-gray-400 mb-1.5 md:mb-2 truncate">{label}</div>
            <div className="text-[24px] md:text-[34px] font-black leading-none" style={{ color }}>{value}</div>
            <div className="text-[10px] md:text-[11px] text-gray-400 mt-1">{unit || <span className="opacity-0">·</span>}</div>
          </div>
        ))}
      </div>

      {shots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <Gauge className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-[14px] font-semibold text-[#111] mb-1">No Range Lab shots yet</p>
          <p className="text-[13px] text-gray-400">Capture shots with Range Lab in the app to see your launch data here.</p>
        </div>
      ) : (
        <>
          {/* Carry trend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Carry Distance Trend</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" />
                <XAxis dataKey="date" tick={CHART.tick} axisLine={false} tickLine={false} />
                <YAxis tick={CHART.tick} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={CHART.tooltip} labelStyle={{ color: '#666' }} itemStyle={{ color: '#22A06B' }} />
                <Line type="monotone" dataKey="carry" stroke="#22A06B" strokeWidth={2} dot={false} name="yds" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent shots */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Recent Shots</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[640px]">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="text-left  pb-2.5 pr-3">Date</th>
                    <th className="text-right pb-2.5 px-3">Ball (mph)</th>
                    <th className="text-right pb-2.5 px-3">Club (mph)</th>
                    <th className="text-right pb-2.5 px-3">Launch°</th>
                    <th className="text-right pb-2.5 px-3">Spin</th>
                    <th className="text-right pb-2.5 px-3">Carry</th>
                    <th className="text-right pb-2.5 px-3">Apex</th>
                    <th className="text-right pb-2.5 px-3">Smash</th>
                    <th className="text-left  pb-2.5 pl-3">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {shots.slice(0, 60).map((s, i) => {
                    const measured = s.is_measured
                    const conf = (s.confidence || (measured ? 'measured' : 'est')).toString()
                    return (
                      <tr key={s.id || i} className="border-b border-gray-50 last:border-0">
                        <td className="text-left  py-2.5 pr-3 text-gray-500 whitespace-nowrap">{format(new Date(s.created_at), 'M/d h:mma')}</td>
                        <td className="text-right py-2.5 px-3 font-bold text-[#111]">{s.ball_speed_ms ? (s.ball_speed_ms * MS_TO_MPH).toFixed(1) : '—'}</td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{s.club_speed_ms ? (s.club_speed_ms * MS_TO_MPH).toFixed(1) : '—'}</td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{s.launch_angle_deg != null ? s.launch_angle_deg.toFixed(1) : '—'}</td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{s.spin_rpm ? Math.round(s.spin_rpm) : '—'}</td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{s.carry_m ? Math.round(s.carry_m * M_TO_YD) + 'y' : '—'}</td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{s.apex_m ? Math.round(s.apex_m * M_TO_FT) + 'ft' : '—'}</td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{s.smash_factor ? s.smash_factor.toFixed(2) : '—'}</td>
                        <td className="text-left  py-2.5 pl-3">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={ measured
                              ? { background: '#E7F6EE', color: '#22A06B' }
                              : { background: '#FDF1E7', color: '#E87830' } }
                          >
                            {measured ? 'Measured' : 'Est'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
    </ProGate>
  )
}
