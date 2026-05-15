'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { fetchRounds } from '@/lib/supabase'
import { format } from 'date-fns'

export default function StatsPage() {
  const [rounds, setRounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchRounds(50).then(d => { setRounds(d); setLoading(false) }) }, [])

  const r = rounds
  const avg = (key: string) => r.length ? (r.reduce((a,x) => a+(x[key]||0),0)/r.length).toFixed(1) : '—'

  const scoreData = [...r].reverse().slice(-20).map(x => ({
    date:  format(new Date(x.created_at), 'M/d'),
    score: x.total_score, gir: x.gir_count, putts: x.putts, fir: x.fairways_hit
  }))

  const kpis = [
    { label:'AVG SCORE',      value:avg('total_score'),        color:'text-white'       },
    { label:'BEST ROUND',     value:r.length ? Math.min(...r.map(x=>x.total_score)) : '—', color:'text-[#FFD700]' },
    { label:'AVG GIR',        value:avg('gir_count'),          color:'text-[#00E578]'   },
    { label:'AVG FAIRWAYS',   value:avg('fairways_hit'),       color:'text-blue-400'    },
    { label:'AVG PUTTS',      value:avg('putts'),              color:'text-purple-400'  },
    { label:'AVG 3-PUTTS',    value:avg('three_putts'),        color:'text-orange-400'  },
    { label:'AVG 1-PUTTS',    value:avg('one_putts'),          color:'text-[#00E578]'   },
    { label:'AVG PENALTIES',  value:avg('total_penalties'),    color:'text-red-400'     },
    { label:'AVG MULLIGANS',  value:avg('total_mulligans'),    color:'text-yellow-400'  },
    { label:'TOTAL ROUNDS',   value:r.length,                  color:'text-white'       },
    { label:'TOTAL SHOTS',    value:r.reduce((a,x)=>a+(x.shot_count||0),0), color:'text-white' },
    { label:'ROUNDS TRACKED', value:r.length,                  color:'text-white'       },
  ]

  if (loading) return <div className="p-8 text-gray-500">Loading stats...</div>

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Stats Overview</h1>
        <p className="text-gray-500 mt-1">Based on {r.length} rounds tracked</p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {kpis.slice(0,6).map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="stat-label mb-2">{s.label}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {kpis.slice(6).map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="stat-label mb-2">{s.label}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-6 mb-6">
        <div className="stat-label mb-4">SCORING TREND</div>
        {scoreData.length >= 3 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
              <XAxis dataKey="date" tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:'#666',fontSize:10}} axisLine={false} tickLine={false} reversed domain={['auto','auto']} />
              <Tooltip contentStyle={{background:'#111',border:'1px solid #1F1F1F',borderRadius:8}} itemStyle={{color:'#FFD700'}} />
              <Line type="monotone" dataKey="score" stroke="#FFD700" strokeWidth={2.5} dot={{fill:'#FFD700',strokeWidth:0,r:4}} />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="h-48 flex items-center justify-center text-gray-600">Complete more rounds</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { key:'gir',   label:'GREENS IN REGULATION', color:'#00E578' },
          { key:'putts', label:'PUTTS PER ROUND',       color:'#A855F7' },
          { key:'fir',   label:'FAIRWAYS HIT',          color:'#60A5FA' },
        ].map(({key,label,color}) => (
          <div key={key} className="card p-6">
            <div className="stat-label mb-4">{label}</div>
            {scoreData.length >= 3 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={scoreData}>
                  <XAxis dataKey="date" tick={{fill:'#666',fontSize:9}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#666',fontSize:9}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{background:'#111',border:'1px solid #1F1F1F',borderRadius:8}} />
                  <Bar dataKey={key} fill={color} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-36 flex items-center justify-center text-gray-600 text-sm">Need more data</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
