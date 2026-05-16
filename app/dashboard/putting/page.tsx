'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import ProGate from '@/components/ProGate'

export default function PuttingPage() {
  const [data,    setData]    = useState<any[]>([])
  const [rounds,  setRounds]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('putt_data')
        .select('*, rounds(course_name, created_at)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('rounds')
        .select('id, created_at, putts, one_putts, three_putts')
        .order('created_at', { ascending: false })
        .limit(20),
    ]).then(([{ data: putts }, { data: rds }]) => {
      setData(putts || [])
      setRounds(rds || [])
      setLoading(false)
    })
  }, [])

  const totalPutts  = data.reduce((a, d) => a + (d.num_putts || 0), 0)
  const threePutts  = data.filter(d => d.num_putts >= 3).length
  const onePutts    = data.filter(d => d.num_putts === 1).length
  const avgPerHole  = data.length ? (totalPutts / data.length).toFixed(2) : '—'

  const shortMisses = data.filter(d => d.leave_result?.includes('Short')).length
  const longMisses  = data.filter(d => d.leave_result?.includes('Long')).length
  const leftMisses  = data.filter(d => d.leave_result?.includes('Left')).length
  const rightMisses = data.filter(d => d.leave_result?.includes('Right')).length

  const causeCounts: Record<string, number> = {}
  data.filter(d => d.three_putt_cause).forEach(d => {
    causeCounts[d.three_putt_cause] = (causeCounts[d.three_putt_cause] || 0) + 1
  })
  const topCauses = Object.entries(causeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const trendData = [...rounds].reverse().map(r => ({
    date:   format(new Date(r.created_at), 'M/d'),
    putts:  r.putts,
    one:    r.one_putts,
    three:  r.three_putts,
  }))

  const CHART = {
    tooltip: { background: 'white', border: '1px solid #E8E2D8', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    tick:    { fill: '#9CA3AF', fontSize: 10 },
    label:   { color: '#9CA3AF', fontSize: 11 },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading putting stats…</div>
    </div>
  )

  return (
    <ProGate feature="PuttBuddy" description="Deep putting analytics — miss patterns, 3-putt causes, and data-driven fixes to stop leaving shots on the green.">
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">PuttBuddy</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Stop counting putts. Start fixing them.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Holes Tracked', value: data.length,  color: '#111'    },
          { label: 'Avg per Hole',  value: avgPerHole,   color: '#C9A84C' },
          { label: '1-Putts',       value: onePutts,     color: '#22A06B' },
          { label: '3-Putts',       value: threePutts,   color: threePutts > 5 ? '#EF4444' : '#111' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
            <div className="text-[36px] font-black leading-none" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Putts per round trend */}
      {trendData.length >= 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Putts per Round — Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" />
              <XAxis dataKey="date" tick={CHART.tick} axisLine={false} tickLine={false} />
              <YAxis tick={CHART.tick} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.label} itemStyle={{ color: '#C9A84C' }} />
              <Line type="monotone" dataKey="putts" stroke="#C9A84C" strokeWidth={2.5} name="Total Putts"
                dot={{ fill: '#C9A84C', strokeWidth: 0, r: 3 }} />
              {trendData.some(d => d.one != null) && (
                <Line type="monotone" dataKey="one" stroke="#22A06B" strokeWidth={1.5} name="1-Putts"
                  dot={false} strokeDasharray="4 2" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Miss pattern */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">Miss Pattern</div>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-36">
              <div className="absolute inset-0 rounded-full bg-[#22A06B]/10 border border-[#22A06B]/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#22A06B]" />
              {shortMisses > 0 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-7 text-red-400 text-xs font-black whitespace-nowrap">
                  ↓ {shortMisses} short
                </div>
              )}
              {longMisses > 0 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-7 text-orange-400 text-xs font-black whitespace-nowrap">
                  ↑ {longMisses} long
                </div>
              )}
              {leftMisses > 0 && (
                <div className="absolute top-1/2 left-0 -translate-x-9 -translate-y-1/2 text-blue-400 text-xs font-black whitespace-nowrap">
                  ← {leftMisses}
                </div>
              )}
              {rightMisses > 0 && (
                <div className="absolute top-1/2 right-0 translate-x-9 -translate-y-1/2 text-blue-400 text-xs font-black whitespace-nowrap">
                  {rightMisses} →
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Short', count: shortMisses, color: '#EF4444' },
              { label: 'Long',  count: longMisses,  color: '#F97316' },
              { label: 'Left',  count: leftMisses,  color: '#60A5FA' },
              { label: 'Right', count: rightMisses, color: '#60A5FA' },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="text-[13px] text-gray-500">{m.label}:</span>
                <span className="text-[13px] font-bold text-[#111]">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3-putt causes + insight */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">3-Putt Causes</div>
          {topCauses.length === 0 ? (
            <div className="text-[13px] text-gray-400 py-4">No 3-putts tracked yet</div>
          ) : topCauses.map(([cause, count]) => (
            <div key={cause} className="mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-[13px] text-[#111]">{cause}</span>
                <span className="text-[13px] font-bold text-orange-400">×{count}</span>
              </div>
              <div className="h-2 bg-[#F8F4EE] rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full"
                  style={{ width: `${threePutts > 0 ? (count / threePutts) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}

          <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Your Putting Issue</div>
            <div className="text-[13px] text-[#111] font-semibold leading-snug">
              {shortMisses > longMisses + leftMisses + rightMisses
                ? `Leaving putts short (${shortMisses} times). "Never up, never in."`
                : threePutts > 3
                ? `${threePutts} three-putts. Focus on lag putting to within 3 feet.`
                : data.length === 0
                ? 'Log putt data in the app to see your patterns.'
                : 'Solid putting! Keep tracking for patterns.'}
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProGate>
  )
}
