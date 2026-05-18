'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/lib/useRealtime'
import { format } from 'date-fns'
import { Loader2, Sparkles, X } from 'lucide-react'

const DISTANCE_BUCKETS = [
  { label: '0–3 ft',  min: 0,  max: 3  },
  { label: '3–6 ft',  min: 3,  max: 6  },
  { label: '6–10 ft', min: 6,  max: 10 },
  { label: '10–15 ft',min: 10, max: 15 },
  { label: '15+ ft',  min: 15, max: 999 },
]

const CHART = {
  tooltip: { background: 'white', border: '1px solid #E8E2D8', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
  tick:    { fill: '#9CA3AF', fontSize: 10 },
  label:   { color: '#9CA3AF', fontSize: 11 },
}

export default function PuttingPage() {
  const [data,       setData]       = useState<any[]>([])
  const [rounds,     setRounds]     = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [aiLoading,  setAiLoading]  = useState(false)
  const [analysis,   setAnalysis]   = useState<any>(null)
  const [aiError,    setAiError]    = useState<string | null>(null)

  function load() {
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
  }
  useEffect(() => { load() }, [])
  const live = useRealtime(['putt_data', 'rounds'], load)

  // ── Core stats ────────────────────────────────────────────────────────────
  const totalPutts  = data.reduce((a, d) => a + (d.num_putts || 0), 0)
  const threePutts  = data.filter(d => d.num_putts >= 3).length
  const onePutts    = data.filter(d => d.num_putts === 1).length
  const avgPerHole  = data.length ? (totalPutts / data.length).toFixed(2) : '—'

  const shortMisses = data.filter(d => d.leave_result?.toLowerCase().includes('short')).length
  const longMisses  = data.filter(d => d.leave_result?.toLowerCase().includes('long')).length
  const leftMisses  = data.filter(d => d.leave_result?.toLowerCase().includes('left')).length
  const rightMisses = data.filter(d => d.leave_result?.toLowerCase().includes('right')).length

  const causeCounts: Record<string, number> = {}
  data.filter(d => d.three_putt_cause).forEach(d => {
    causeCounts[d.three_putt_cause] = (causeCounts[d.three_putt_cause] || 0) + 1
  })
  const topCauses = Object.entries(causeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)

  // ── Distance buckets ──────────────────────────────────────────────────────
  const hasDistance = data.some(d => d.putt_distance_ft != null || d.distance_ft != null || d.distance != null)
  const distField   = data[0]?.putt_distance_ft != null ? 'putt_distance_ft'
                    : data[0]?.distance_ft != null ? 'distance_ft'
                    : data[0]?.distance != null ? 'distance' : null

  const distanceBuckets = DISTANCE_BUCKETS.map(b => {
    const inRange  = distField ? data.filter(d => {
      const ft = d[distField]
      return ft != null && ft >= b.min && ft < b.max
    }) : []
    const makes    = inRange.filter(d => d.num_putts === 1).length
    const total    = inRange.length
    const pct      = total > 0 ? Math.round((makes / total) * 100) : null
    return { ...b, makes, total, pct }
  })

  // ── Trend ─────────────────────────────────────────────────────────────────
  const trendData = [...rounds].reverse().map(r => ({
    date:  format(new Date(r.created_at), 'M/d'),
    putts: r.putts,
    one:   r.one_putts,
    three: r.three_putts,
  }))

  const recentPutts = trendData.slice(-5).map(d => d.putts).filter(Boolean)
  const trendDirection = recentPutts.length >= 2
    ? recentPutts[recentPutts.length - 1] < recentPutts[0] ? 'Improving' : 'Getting worse'
    : 'Not enough data'

  // ── AI analysis ───────────────────────────────────────────────────────────
  async function runAiAnalysis() {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/putting', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: {
            totalHoles: data.length, avgPerHole, onePutts, threePutts,
            shortMisses, longMisses, leftMisses, rightMisses,
            topCauses, distanceBuckets, trendDirection,
          },
        }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const { analysis: a, error: apiErr } = await res.json()
      if (apiErr) throw new Error(apiErr)
      setAnalysis(a)
    } catch (e: any) {
      setAiError(e.message ?? 'Something went wrong')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading putting stats…</div>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
            <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-black text-[#111] tracking-tight">PuttBuddy</h1>
            {live && <span className="flex items-center gap-1 text-[10px] font-bold text-[#22A06B] bg-green-50 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse inline-block" />Live</span>}
          </div>
          <p className="text-[13px] text-gray-400 mt-0.5">Stop counting putts. Start fixing them.</p>
        </div>
        <button
          onClick={runAiAnalysis}
          disabled={aiLoading || data.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E87830] text-white rounded-xl text-[13px] font-bold hover:bg-[#d06a20] transition-colors disabled:opacity-40 shrink-0"
        >
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI Putting Coach
        </button>
      </div>

      {/* AI Analysis */}
      {aiLoading && (
        <div className="flex items-center gap-3 bg-[#FEF3E8] border border-[#E87830]/20 rounded-2xl px-5 py-4">
          <Loader2 className="w-4 h-4 text-[#E87830] animate-spin shrink-0" />
          <span className="text-[13px] font-medium text-[#E87830]">Claude is analysing your putting…</span>
        </div>
      )}

      {aiError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <span className="text-[13px] text-red-500">{aiError}</span>
          <button onClick={() => setAiError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {analysis && (
        <div className="bg-white rounded-2xl border border-[#E87830]/20 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-[#FEF3E8] border-b border-[#E87830]/10 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black text-[#E87830] tracking-widest uppercase mb-1">AI Putting Coach</div>
              <p className="text-[14px] font-bold text-[#111]">{analysis.headline}</p>
            </div>
            <button onClick={() => setAnalysis(null)} className="shrink-0 mt-0.5"><X className="w-4 h-4 text-gray-400" /></button>
          </div>

          <div className="p-5 bg-red-50 border-b border-gray-100">
            <div className="text-[10px] font-black text-red-400 tracking-widest uppercase mb-1.5">Biggest Issue</div>
            <p className="text-[13.5px] font-semibold text-[#111]">{analysis.biggest_issue}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {[analysis.drill_1, analysis.drill_2].map((drill, i) => drill && (
              <div key={i} className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[#E87830] flex items-center justify-center text-white text-[11px] font-black shrink-0">{i + 1}</div>
                  <div className="text-[13px] font-black text-[#111]">{drill.name}</div>
                </div>
                <p className="text-[12.5px] text-gray-600 mb-2 leading-relaxed">{drill.how}</p>
                <div className="text-[11px] text-[#22A06B] font-semibold bg-green-50 rounded-lg px-3 py-1.5">🎯 {drill.targets}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t border-gray-100">
            <div className="p-5">
              <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">On-Course Tip</div>
              <p className="text-[13px] text-[#111]">{analysis.on_course_tip}</p>
            </div>
            <div className="p-5">
              <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">Green Reading</div>
              <p className="text-[13px] text-[#111]">{analysis.green_reading_note}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Holes Tracked', value: data.length,  color: 'text-[#111]'     },
          { label: 'Avg per Hole',  value: avgPerHole,   color: 'text-[#C9A84C]'  },
          { label: '1-Putts',       value: onePutts,     color: 'text-[#22A06B]'  },
          { label: '3-Putts',       value: threePutts,   color: threePutts > 5 ? 'text-red-500' : 'text-[#111]' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
            <div className={`text-[32px] font-black leading-none ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Distance breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Make % by Distance</div>
        {hasDistance && distField ? (
          <div className="space-y-3">
            {distanceBuckets.map(b => (
              <div key={b.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-semibold text-[#111]">{b.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-gray-400">{b.makes}/{b.total}</span>
                    <span className={`text-[14px] font-black w-12 text-right ${
                      b.pct == null ? 'text-gray-300'
                      : b.pct >= 80 ? 'text-[#22A06B]'
                      : b.pct >= 50 ? 'text-[#C9A84C]'
                      : 'text-red-400'
                    }`}>
                      {b.pct != null ? `${b.pct}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[#F8F4EE] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${b.pct ?? 0}%`,
                      background: b.pct == null ? '#E8E2D8'
                        : b.pct >= 80 ? '#22A06B'
                        : b.pct >= 50 ? '#C9A84C'
                        : '#EF4444',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-[13px] text-gray-400 mb-1">No distance data yet</p>
            <p className="text-[12px] text-gray-300">Log putts with distance in the app to see your make % by range</p>
          </div>
        )}
      </div>

      {/* Trend */}
      {trendData.length >= 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Putts per Round — Trend</div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              trendDirection === 'Improving' ? 'bg-green-50 text-[#22A06B]' : 'bg-red-50 text-red-400'
            }`}>{trendDirection}</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" />
              <XAxis dataKey="date" tick={CHART.tick} axisLine={false} tickLine={false} />
              <YAxis tick={CHART.tick} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.label} />
              <Line type="monotone" dataKey="putts" stroke="#C9A84C" strokeWidth={2.5} name="Total Putts"
                dot={{ fill: '#C9A84C', strokeWidth: 0, r: 3 }} />
              {trendData.some(d => d.one != null) && (
                <Line type="monotone" dataKey="one" stroke="#22A06B" strokeWidth={1.5} name="1-Putts"
                  dot={false} strokeDasharray="4 2" />
              )}
              {trendData.some(d => d.three != null) && (
                <Line type="monotone" dataKey="three" stroke="#EF4444" strokeWidth={1.5} name="3-Putts"
                  dot={false} strokeDasharray="4 2" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Miss pattern */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">Miss Pattern</div>
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-44 h-32">
              <div className="absolute inset-0 rounded-full bg-[#22A06B]/10 border-2 border-[#22A06B]/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#22A06B]" />
              {longMisses > 0 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 text-orange-400 text-[11px] font-black whitespace-nowrap">
                  ↑ {longMisses} long
                </div>
              )}
              {shortMisses > 0 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-red-400 text-[11px] font-black whitespace-nowrap">
                  ↓ {shortMisses} short
                </div>
              )}
              {leftMisses > 0 && (
                <div className="absolute top-1/2 left-0 -translate-x-9 -translate-y-1/2 text-blue-400 text-[11px] font-black whitespace-nowrap">
                  ← {leftMisses}
                </div>
              )}
              {rightMisses > 0 && (
                <div className="absolute top-1/2 right-0 translate-x-9 -translate-y-1/2 text-blue-400 text-[11px] font-black whitespace-nowrap">
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
              <div key={m.label} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="text-[12px] text-gray-500">{m.label}</span>
                <span className="text-[13px] font-black text-[#111] ml-auto">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3-putt causes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">3-Putt Causes</div>
          {topCauses.length === 0 ? (
            <div className="py-4 text-[13px] text-gray-400">No 3-putts tracked yet</div>
          ) : topCauses.map(([cause, count]) => (
            <div key={cause} className="mb-3 last:mb-0">
              <div className="flex justify-between mb-1">
                <span className="text-[13px] text-[#111]">{cause}</span>
                <span className="text-[12px] font-bold text-orange-400">×{count}</span>
              </div>
              <div className="h-2 bg-[#F8F4EE] rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full"
                  style={{ width: `${threePutts > 0 ? (count / threePutts) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}

          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1.5">Your Putting Issue</div>
            <p className="text-[13px] text-[#111] font-semibold leading-snug">
              {data.length === 0
                ? 'Log putt data in the app to see your patterns.'
                : shortMisses > longMisses + leftMisses + rightMisses
                ? `Leaving putts short (${shortMisses} times) — "Never up, never in."`
                : threePutts > 3
                ? `${threePutts} three-putts. Focus on lag putting to within 3 feet.`
                : 'Solid putting — keep tracking to spot patterns.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
