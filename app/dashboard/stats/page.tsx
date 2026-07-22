'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { fetchRounds } from '@/lib/supabase'
import { useRealtime } from '@/lib/useRealtime'
import { format } from 'date-fns'

const CHART = {
  grid:       '#EDE8DC',
  tick:       { fill: '#9CA3AF', fontSize: 10 },
  tooltip:    { background: 'white', border: '1px solid #E8E2D8', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
  labelStyle: { color: '#9CA3AF', fontSize: 11 },
}

export default function StatsPage() {
  const [rounds,  setRounds]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  function load() { fetchRounds(100).then(d => { setRounds(d); setLoading(false) }) }
  useEffect(() => { load() }, [])
  const live = useRealtime(['rounds'], load)

  const r = rounds

  const avg = (key: string) => {
    const vals = r.filter(x => x[key] != null).map(x => x[key])
    return vals.length ? (vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(1) : '—'
  }

  const scoreData = [...r].reverse().slice(-20).map(x => ({
    date:  format(new Date(x.created_at), 'M/d'),
    score: x.total_score,
    gir:   x.gir_count,
    putts: x.putts,
    fir:   x.fairways_hit,
  }))

  const birdieMinus = r.reduce((a, x) => a + (x.birdies_or_better ?? 0), 0)
  const pars        = r.reduce((a, x) => a + (x.pars ?? 0), 0)
  const bogeys      = r.reduce((a, x) => a + (x.bogeys ?? 0), 0)
  const doubles     = r.reduce((a, x) => a + (x.doubles_or_worse ?? 0), 0)
  const totalHoles  = birdieMinus + pars + bogeys + doubles

  const kpis = [
    { label: 'Avg Score',     value: avg('total_score'),    gold: false },
    { label: 'Best Round',    value: r.length ? String(Math.min(...r.filter(x => x.total_score).map(x => x.total_score))) : '—', gold: true },
    { label: 'Avg GIR',       value: avg('gir_count'),      gold: false },
    { label: 'Avg Fairways',  value: avg('fairways_hit'),   gold: false },
    { label: 'Avg Putts',     value: avg('putts'),          gold: false },
    { label: 'Avg 3-Putts',   value: avg('three_putts'),    gold: false },
    { label: 'Avg 1-Putts',   value: avg('one_putts'),      gold: false },
    { label: 'Avg Penalties', value: avg('total_penalties'), gold: false },
    { label: 'Total Rounds',  value: String(r.length),      gold: false },
    { label: 'Total Shots',   value: String(r.reduce((a, x) => a + (x.shot_count || 0), 0)), gold: false },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading stats…</div>
    </div>
  )

  return (
    <div className="p-5 md:p-6 max-w-4xl space-y-5 pb-10">

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-[26px] font-black text-[#111] tracking-tight">Stats Overview</h1>
          
        </div>
        <p className="text-[13.5px] text-gray-400 mt-0.5">
          Based on {r.length} round{r.length !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {kpis.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
            <div className={`text-[26px] font-black ${s.gold ? 'text-[#C9A84C]' : 'text-[#111]'}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Scoring breakdown */}
      {totalHoles > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Scoring Breakdown</div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Birdie or Better', count: birdieMinus, color: '#22A06B', bg: 'bg-green-50' },
              { label: 'Par',              count: pars,        color: '#60A5FA', bg: 'bg-blue-50'  },
              { label: 'Bogey',            count: bogeys,      color: '#F59E0B', bg: 'bg-amber-50' },
              { label: 'Double+',          count: doubles,     color: '#EF4444', bg: 'bg-red-50'   },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <div className="text-[22px] font-black" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[10px] font-semibold text-gray-500 mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Stacked bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {[
              { count: birdieMinus, color: '#22A06B' },
              { count: pars,        color: '#60A5FA' },
              { count: bogeys,      color: '#F59E0B' },
              { count: doubles,     color: '#EF4444' },
            ].map((s, i) => s.count > 0 ? (
              <div
                key={i}
                className="h-full transition-all"
                style={{ width: `${(s.count / totalHoles) * 100}%`, background: s.color }}
              />
            ) : null)}
          </div>
        </div>
      )}

      {/* Scoring trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Scoring Trend</div>
        {scoreData.length >= 3 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scoreData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="date" tick={CHART.tick} axisLine={false} tickLine={false} />
              <YAxis tick={CHART.tick} axisLine={false} tickLine={false} reversed domain={['auto', 'auto']} />
              <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.labelStyle} itemStyle={{ color: '#C9A84C' }} />
              <Area type="monotone" dataKey="score" stroke="#C9A84C" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: '#C9A84C', strokeWidth: 0, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-300 text-[13px]">
            Complete more rounds to see your scoring trend
          </div>
        )}
      </div>

      {/* Bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'gir',   label: 'Greens in Regulation', color: '#22A06B' },
          { key: 'putts', label: 'Putts per Round',       color: '#C9A84C' },
          { key: 'fir',   label: 'Fairways Hit',          color: '#60A5FA' },
        ].map(({ key, label, color }) => (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">{label}</div>
            {scoreData.length >= 3 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="date" tick={CHART.tick} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART.tick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.labelStyle} itemStyle={{ color }} />
                  <Bar dataKey={key} fill={color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-36 flex items-center justify-center text-gray-300 text-[12px]">Need more data</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
