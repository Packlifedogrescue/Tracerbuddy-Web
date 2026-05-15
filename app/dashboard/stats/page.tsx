'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { fetchRounds } from '@/lib/supabase'
import { format } from 'date-fns'

const CHART = {
  grid:    '#EDE8DC',
  tick:    { fill: '#9CA3AF', fontSize: 10 },
  tooltip: { background: 'white', border: '1px solid #E8E2D8', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
  line:    '#C9A84C',
  itemStyle: { color: '#C9A84C' },
  labelStyle: { color: '#9CA3AF', fontSize: 11 },
}

export default function StatsPage() {
  const [rounds,  setRounds]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchRounds(50).then(d => { setRounds(d); setLoading(false) }) }, [])

  const r   = rounds
  const avg = (key: string) =>
    r.length && r.some(x => x[key])
      ? (r.filter(x => x[key]).reduce((a, x) => a + (x[key] || 0), 0) / r.filter(x => x[key]).length).toFixed(1)
      : '—'

  const scoreData = [...r]
    .reverse()
    .slice(-20)
    .map(x => ({
      date:  format(new Date(x.created_at), 'M/d'),
      score: x.total_score,
      gir:   x.gir_count,
      putts: x.putts,
      fir:   x.fairways_hit,
    }))

  const kpis = [
    { label: 'Avg Score',      value: avg('total_score'),   gold: false },
    { label: 'Best Round',     value: r.length ? String(Math.min(...r.filter(x=>x.total_score).map(x=>x.total_score))) : '—', gold: true },
    { label: 'Avg GIR',        value: avg('gir_count'),     gold: false },
    { label: 'Avg Fairways',   value: avg('fairways_hit'),  gold: false },
    { label: 'Avg Putts',      value: avg('putts'),         gold: false },
    { label: 'Avg 3-Putts',    value: avg('three_putts'),   gold: false },
    { label: 'Avg 1-Putts',    value: avg('one_putts'),     gold: false },
    { label: 'Avg Penalties',  value: avg('total_penalties'),gold: false },
    { label: 'Avg Mulligans',  value: avg('total_mulligans'),gold: false },
    { label: 'Total Rounds',   value: String(r.length),     gold: false },
    { label: 'Total Shots',    value: String(r.reduce((a,x)=>a+(x.shot_count||0),0)), gold: false },
    { label: 'Rounds Tracked', value: String(r.length),     gold: false },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400">Loading stats…</p>
    </div>
  )

  return (
    <div className="p-5 md:p-6 space-y-5 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">Stats Overview</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">
          Based on {r.length} round{r.length !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {/* KPI grid — row 1 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {kpis.slice(0, 6).map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="stat-label mb-2">{s.label}</div>
            <div className={`text-[24px] font-black ${s.gold ? 'text-[#C9A84C]' : 'text-[#111]'}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* KPI grid — row 2 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {kpis.slice(6).map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="stat-label mb-2">{s.label}</div>
            <div className={`text-[24px] font-black ${s.gold ? 'text-[#C9A84C]' : 'text-[#111]'}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Scoring trend */}
      <div className="card p-5">
        <div className="stat-label mb-4">Scoring Trend</div>
        {scoreData.length >= 3 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="date" tick={CHART.tick} axisLine={false} tickLine={false} />
              <YAxis tick={CHART.tick} axisLine={false} tickLine={false} reversed domain={['auto','auto']} />
              <Tooltip
                contentStyle={CHART.tooltip}
                labelStyle={CHART.labelStyle}
                itemStyle={CHART.itemStyle}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={CHART.line}
                strokeWidth={2.5}
                dot={{ fill: CHART.line, strokeWidth: 0, r: 4 }}
              />
            </LineChart>
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
          <div key={key} className="card p-5">
            <div className="stat-label mb-4">{label}</div>
            {scoreData.length >= 3 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="date" tick={CHART.tick} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART.tick} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={CHART.tooltip}
                    labelStyle={CHART.labelStyle}
                    itemStyle={{ color }}
                  />
                  <Bar dataKey={key} fill={color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-36 flex items-center justify-center text-gray-300 text-[12px]">
                Need more data
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
