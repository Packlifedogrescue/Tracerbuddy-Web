'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/lib/useRealtime'
import { format } from 'date-fns'
import { Activity, Zap, TrendingUp, PlayCircle, Sparkles, Star } from 'lucide-react'
import ProGate from '@/components/ProGate'
import LiveBadge from '@/components/LiveBadge'
import Link from 'next/link'

// Swing Tuner = the merged swing feature. Primary: video/pose analyses written by
// the iOS engine to `swings` (Swing DNA score + biomechanics + AI coaching).
// Secondary: Apple Watch clubhead speed from `club_sessions` (the old SwingTrace).
export default function SwingTunerPage() {
  const [analyses, setAnalyses] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  function load() {
    Promise.all([
      supabase.from('swings').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('club_sessions').select('*').order('recorded_at', { ascending: false }).limit(200),
    ]).then(([a, s]) => {
      setAnalyses(a.data || [])
      setSessions(s.data || [])
      setLoading(false)
    })
  }
  useEffect(load, [])
  const live = useRealtime(['swings', 'club_sessions'], load)

  // ── Swing DNA (video analyses) ──
  const scored = analyses.filter(s => s.dna_score)
  const avgDna = scored.length ? Math.round(scored.reduce((a, s) => a + (s.dna_score || 0), 0) / scored.length) : 0
  const bestDna = analyses.length ? Math.max(...analyses.map(s => s.dna_score || 0)) : 0

  // ── Apple Watch clubhead speed (the old SwingTrace) ──
  const avgSpeed = sessions.length ? (sessions.reduce((a, s) => a + (s.swing_speed || 0), 0) / sessions.length).toFixed(1) : '—'
  const maxSpeed = sessions.length ? Math.max(...sessions.map(s => s.swing_speed || 0)) : 0
  const driver   = sessions.filter(s => s.club_name === 'Driver')
  const avgDriver = driver.length ? (driver.reduce((a, s) => a + (s.swing_speed || 0), 0) / driver.length).toFixed(1) : '—'
  const trendData = [...sessions].reverse().slice(-50).map(s => ({ speed: s.swing_speed, date: format(new Date(s.recorded_at), 'M/d') }))
  const byClub: Record<string, number[]> = {}
  sessions.forEach(s => { if (s.club_name && s.swing_speed) (byClub[s.club_name] = byClub[s.club_name] || []).push(s.swing_speed) })
  const clubAvgs = Object.entries(byClub)
    .map(([club, sp]) => ({ club, avg: sp.reduce((a, b) => a + b) / sp.length, count: sp.length }))
    .sort((a, b) => b.avg - a.avg)

  const CHART = {
    tooltip: { background: 'white', border: '1px solid #E8E2D8', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    tick:    { fill: '#9CA3AF', fontSize: 10 },
  }
  const dnaColor = (n: number) => n >= 80 ? '#22A06B' : n >= 60 ? '#C9A84C' : '#EF4444'
  const fmt = (v: unknown, d = 1) => (v == null || Number(v) === 0) ? '—' : Number(v).toFixed(d)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading swings…</div>
    </div>
  )

  return (
    <ProGate feature="Swing Tuner" description="Video swing analysis — pose tracking, a Swing DNA score, and AI coaching — plus Apple Watch clubhead-speed trends.">
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-black text-[#111] tracking-tight">Swing Tuner</h1>
            <LiveBadge live={live} />
          </div>
          <p className="text-[13.5px] text-gray-400 mt-0.5">
            {analyses.length} swing{analyses.length === 1 ? '' : 's'} analyzed · {sessions.length} watch swings
          </p>
        </div>
        <Link href="/dashboard/swing/replay"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all hover:opacity-90"
          style={{ background: '#0A0A0A', color: '#C9A84C', border: '1px solid #C9A84C33' }}>
          <PlayCircle className="w-4 h-4" />
          Swing Replay
        </Link>
      </div>

      {/* ── Swing DNA (video analyses) ── */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#C9A84C]" />
        <h2 className="text-[13px] font-black uppercase tracking-widest text-[#111]">Swing DNA</h2>
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center mb-8">
          <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-[14px] font-semibold text-[#111] mb-1">No swing analyses yet</p>
          <p className="text-[13px] text-gray-400 max-w-sm mx-auto">
            Record a swing in the app to get a Swing DNA score, tempo and X-factor, and AI coaching. Analyses show up here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Avg DNA',  value: avgDna || '—',  color: dnaColor(avgDna) },
              { label: 'Best DNA', value: bestDna || '—', color: dnaColor(bestDna) },
              { label: 'Analyzed', value: analyses.length, color: '#111' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5 text-center">
                <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-gray-400 mb-1.5 md:mb-2 truncate">{label}</div>
                <div className="text-[24px] md:text-[36px] font-black leading-none" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-8">
            {analyses.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <div className="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                  style={{ background: `${dnaColor(s.dna_score || 0)}15` }}>
                  <div className="text-[20px] font-black leading-none" style={{ color: dnaColor(s.dna_score || 0) }}>{s.dna_score || '—'}</div>
                  <div className="text-[7.5px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">DNA</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#111] text-[14px] truncate">{s.title || 'Swing'}</span>
                    {s.is_favorite && <Star className="w-3.5 h-3.5 text-[#C9A84C] fill-[#C9A84C]" />}
                  </div>
                  <div className="text-[11.5px] text-gray-400">
                    {s.club} · {s.shot_type} · {s.created_at ? format(new Date(s.created_at), 'MMM d, h:mma') : ''}
                  </div>
                  {s.ai_priority_fix && (
                    <div className="text-[12px] text-[#111] mt-1.5">
                      <span className="text-[#C9A84C] font-bold">Fix: </span>{s.ai_priority_fix}
                    </div>
                  )}
                </div>
                <div className="shrink-0 grid grid-cols-2 gap-x-4 gap-y-1 text-right">
                  <div><div className="text-[13px] font-black text-[#111] tabular-nums">{fmt(s.tempo_ratio, 1)}</div><div className="text-[8.5px] uppercase tracking-wide text-gray-400">Tempo</div></div>
                  <div><div className="text-[13px] font-black text-[#111] tabular-nums">{fmt(s.x_factor_at_impact, 0)}°</div><div className="text-[8.5px] uppercase tracking-wide text-gray-400">X-Factor</div></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Apple Watch clubhead speed (formerly SwingTrace) ── */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-[#C9A84C]" />
        <h2 className="text-[13px] font-black uppercase tracking-widest text-[#111]">Clubhead Speed · Apple Watch</h2>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Activity className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-[14px] font-semibold text-[#111] mb-1">No swing speed yet</p>
          <p className="text-[13px] text-gray-400">Wear your Apple Watch during rounds to track clubhead speed.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: 'Avg Speed',  value: avgSpeed,        unit: 'mph', icon: Activity,   color: '#C9A84C' },
              { label: 'Best Swing', value: maxSpeed || '—', unit: 'mph', icon: Zap,        color: '#22A06B' },
              { label: 'Avg Driver', value: avgDriver,       unit: 'mph', icon: TrendingUp, color: '#111'    },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5 text-center">
                <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-gray-400 mb-1.5 md:mb-2 truncate">{label}</div>
                <div className="text-[24px] md:text-[36px] font-black leading-none" style={{ color }}>{value}</div>
                <div className="text-[10px] md:text-[11px] text-gray-400 mt-1">{unit}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
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

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Speed by Club</div>
            <div className="space-y-3.5">
              {clubAvgs.map(({ club, avg, count }) => (
                <div key={club} className="flex items-center gap-4">
                  <div className="w-16 font-bold text-[#111] text-[13.5px]">{club}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-[#F8F4EE] rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A84C] rounded-full transition-all"
                        style={{ width: `${maxSpeed > 0 ? (avg / maxSpeed) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="text-right w-24">
                    <span className="text-[#111] font-black text-[13.5px]">{avg.toFixed(1)}</span>
                    <span className="text-gray-400 text-[11px] ml-1">mph ({count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
    </ProGate>
  )
}
