'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Target } from 'lucide-react'
import ProGate from '@/components/ProGate'

export default function PracticePage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.from('practice_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [])

  const byClub: Record<string, { shots: number; totalYards: number }> = {}
  sessions.forEach(s => {
    if (s.club) {
      byClub[s.club] = byClub[s.club] || { shots: 0, totalYards: 0 }
      byClub[s.club].shots++
      byClub[s.club].totalYards += s.yards || 0
    }
  })
  const clubData = Object.entries(byClub)
    .map(([club, d]) => ({ club, shots: d.shots, avg: Math.round(d.totalYards / d.shots) }))
    .sort((a, b) => b.avg - a.avg)

  const thisWeek   = sessions.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 86400000)).length
  const lastSession = sessions[0]?.created_at

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading practice data…</div>
    </div>
  )

  return (
    <ProGate feature="Practice Sessions" description="Track your range sessions and see which clubs you're developing — shots hit, avg distances, and weekly activity.">
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">Practice</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">{sessions.length} range shots tracked</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Shots',      value: sessions.length,            color: '#C9A84C' },
          { label: 'This Week',        value: thisWeek,                   color: '#22A06B' },
          { label: 'Clubs Practiced',  value: Object.keys(byClub).length, color: '#111'    },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
            <div className="text-[36px] font-black leading-none" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F8F4EE] flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6 text-[#C9A84C]" />
          </div>
          <p className="text-[14px] font-semibold text-[#111] mb-1">No practice sessions yet</p>
          <p className="text-[13px] text-gray-400">Use Practice Mode in the TracerBuddy app at the range.</p>
        </div>
      ) : (
        <>
          {/* Avg distance by club */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Avg Distance by Club</div>
            <ResponsiveContainer width="100%" height={Math.max(clubData.length * 36, 160)}>
              <BarChart data={clubData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} unit=" yds" />
                <YAxis type="category" dataKey="club" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: any) => [`${v} yds`, 'Avg']}
                />
                <Bar dataKey="avg" fill="#C9A84C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent shots */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recent Shots</span>
              {lastSession && (
                <span className="text-[11.5px] text-gray-400">
                  Last: {format(new Date(lastSession), 'MMM d')}
                </span>
              )}
            </div>
            {sessions.slice(0, 20).map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0">
                <div className="w-14 font-black text-[#111] text-[13.5px]">{s.club}</div>
                <div className="flex-1">
                  <div className="text-[13px] text-gray-500">{s.notes || 'Range shot'}</div>
                </div>
                <div className="text-[#C9A84C] font-black text-[13.5px]">
                  {s.yards ? `${Math.round(s.yards)}y` : '—'}
                </div>
                <div className="text-[11.5px] text-gray-400 w-10 text-right">
                  {format(new Date(s.created_at), 'M/d')}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </ProGate>
  )
}
