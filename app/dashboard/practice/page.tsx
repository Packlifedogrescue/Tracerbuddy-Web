'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export default function PracticePage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.from('practice_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [])

  const byClub: Record<string, { shots: number, totalYards: number }> = {}
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

  if (loading) return <div className="p-8 text-gray-500">Loading practice data...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#111]">Practice Sessions</h1>
        <p className="text-gray-500 mt-1">{sessions.length} range shots tracked</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 text-center">
          <div className="stat-label mb-2">TOTAL SHOTS</div>
          <div className="text-4xl font-black text-[#FFD700]">{sessions.length}</div>
        </div>
        <div className="card p-5 text-center">
          <div className="stat-label mb-2">CLUBS PRACTICED</div>
          <div className="text-4xl font-black text-[#111]">{Object.keys(byClub).length}</div>
        </div>
        <div className="card p-5 text-center">
          <div className="stat-label mb-2">THIS WEEK</div>
          <div className="text-4xl font-black text-[#00E578]">
            {sessions.filter(s => new Date(s.created_at) > new Date(Date.now() - 7*86400000)).length}
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card p-16 text-center text-gray-600">
          <div className="text-5xl mb-4">🎯</div>
          No practice sessions yet. Use Practice Mode in the app at the range.
        </div>
      ) : (
        <>
          <div className="card p-6 mb-6">
            <div className="stat-label mb-4">PRACTICE DISTANCE BY CLUB</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clubData} layout="vertical">
                <XAxis type="number" tick={{ fill:'#666', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="club" tick={{ fill:'#999', fontSize:11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background:'#111', border:'1px solid #1F1F1F', borderRadius:8 }} />
                <Bar dataKey="avg" fill="#FFD700" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card divide-y divide-[#1F1F1F]">
            <div className="stat-label p-4">RECENT PRACTICE SHOTS</div>
            {sessions.slice(0, 20).map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-12 font-black text-[#111]">{s.club}</div>
                <div className="flex-1">
                  <div className="text-sm text-gray-500">{s.notes || 'Range shot'}</div>
                </div>
                <div className="text-[#FFD700] font-black">{s.yards ? `${Math.round(s.yards)}y` : '—'}</div>
                <div className="text-xs text-gray-600">{format(new Date(s.created_at), 'M/d')}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
