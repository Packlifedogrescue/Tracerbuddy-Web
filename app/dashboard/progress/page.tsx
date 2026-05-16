'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { fetchRounds, fetchHandicapHistory, fetchUserProfile } from '@/lib/supabase'
import { format } from 'date-fns'

export default function ProgressPage() {
  const [rounds, setRounds]     = useState<any[]>([])
  const [handicap, setHandicap] = useState<any[]>([])
  const [profile, setProfile]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([fetchRounds(50), fetchHandicapHistory(), fetchUserProfile()])
      .then(([r, h, p]) => {
        setRounds(r)
        setHandicap(h.map((x:any) => ({
          date: format(new Date(x.recorded_at), 'MMM d'),
          hdcp: parseFloat(x.handicap?.toFixed(1))
        })))
        setProfile(p)
        setLoading(false)
      })
  }, [])

  const scoreData = [...rounds].reverse().map(r => ({
    date:  format(new Date(r.created_at), 'M/d'),
    score: r.total_score,
    gir:   r.gir_count || 0,
  }))

  const firstHdcp = handicap[0]?.hdcp
  const lastHdcp  = handicap[handicap.length-1]?.hdcp
  const improvement = firstHdcp && lastHdcp ? (firstHdcp - lastHdcp).toFixed(1) : null

  const milestones = [
    { label: 'First Round',     value: rounds.length > 0 ? format(new Date(rounds[rounds.length-1]?.created_at), 'MMM d, yyyy') : '—', icon: '🏌️' },
    { label: 'Best Round',      value: rounds.length ? `${Math.min(...rounds.map(r => r.total_score))}` : '—',                          icon: '⭐' },
    { label: 'Current Handicap',value: profile?.handicap_index?.toFixed(1) ?? '—',                                                         icon: '#️⃣' },
    { label: 'Total Rounds',    value: `${rounds.length}`,                                                                                  icon: '📅' },
    { label: 'Total Shots',     value: `${rounds.reduce((a,r) => a + (r.shot_count||0), 0)}`,                                               icon: '🏹' },
    { label: 'Improvement',     value: improvement ? `${improvement} strokes` : 'Keep playing',                                             icon: '📈' },
  ]

  if (loading) return <div className="p-8 text-gray-500">Loading progress...</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#111]">My Golf Journey</h1>
        <p className="text-gray-500 mt-1">Every round. Every improvement. Your complete golf history.</p>
      </div>

      {/* Milestones */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {milestones.map(m => (
          <div key={m.label} className="card p-5">
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="text-xl font-black text-[#FFD700]">{m.value}</div>
            <div className="stat-label mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Handicap journey */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="stat-label">HANDICAP JOURNEY</div>
          {improvement && Number(improvement) > 0 && (
            <div className="text-[#00E578] font-black text-sm">↓ {improvement} strokes improved</div>
          )}
        </div>
        {handicap.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={handicap}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" />
              <XAxis dataKey="date" tick={{ fill:'#666', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#666', fontSize:10 }} axisLine={false} tickLine={false} reversed />
              {profile?.goal_settings?.target_handicap && (
                <ReferenceLine y={profile.goal_settings.target_handicap} stroke="#FFD700" strokeDasharray="4 4"
                  label={{ value:'Goal', fill:'#FFD700', fontSize:10 }} />
              )}
              <Tooltip contentStyle={{ background:'#111', border:'1px solid #1F1F1F', borderRadius:8 }}
                       itemStyle={{ color:'#FFD700' }} />
              <Line type="monotone" dataKey="hdcp" stroke="#FFD700" strokeWidth={3}
                dot={{ fill:'#FFD700', strokeWidth:0, r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-600">
            Complete more rounds to see your handicap journey
          </div>
        )}
      </div>

      {/* Score history */}
      <div className="card p-6">
        <div className="stat-label mb-4">SCORE HISTORY ({rounds.length} rounds)</div>
        {scoreData.length >= 3 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" />
              <XAxis dataKey="date" tick={{ fill:'#666', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#666', fontSize:10 }} axisLine={false} tickLine={false} reversed domain={['auto','auto']} />
              <Tooltip contentStyle={{ background:'#111', border:'1px solid #1F1F1F', borderRadius:8 }}
                       itemStyle={{ color:'#60A5FA' }} />
              <Line type="monotone" dataKey="score" stroke="#60A5FA" strokeWidth={2}
                dot={{ fill:'#60A5FA', strokeWidth:0, r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-600">Keep tracking rounds</div>
        )}
      </div>
    </div>
  )
}
