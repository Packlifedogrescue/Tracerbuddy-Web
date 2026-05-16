'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { fetchRoundWithShots } from '@/lib/supabase'
import { format } from 'date-fns'

// Dynamic import for Leaflet (no SSR)
const ShotMap = dynamic(() => import('@/components/ShotMap'), { ssr: false })

export default function RoundDetailPage() {
  const { id }   = useParams()
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchRoundWithShots(id as string).then(d => { setData(d); setLoading(false) })
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-4xl animate-pulse">⛳</div>
    </div>
  )

  const { round, shots, holeStats } = data
  if (!round) return <div className="p-8 text-gray-500">Round not found</div>

  const par = holeStats.reduce((a: number, h: any) => a + (h.par || 4), 0)
  const scoreDiff = round.total_score - par

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href="/dashboard/rounds" className="text-gray-500 hover:text-[#111] mt-1">← Back</Link>
        <div className="flex-1">
          <h1 className="text-3xl font-black text-[#111]">{round.course_name}</h1>
          <p className="text-gray-500 mt-1">
            {format(new Date(round.created_at), 'EEEE, MMMM d yyyy')} · {round.round_mode || 'Stroke Play'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-black text-[#111]">{round.total_score}</div>
          <div className={`text-lg font-black ${scoreDiff <= 0 ? 'text-[#00E578]' : 'text-[#FFD700]'}`}>
            {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? 'E' : scoreDiff}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {[
          { label: 'GIR',      value: `${round.gir_count ?? 0}/18` },
          { label: 'FAIRWAYS', value: `${round.fairways_hit ?? 0}/14` },
          { label: 'PUTTS',    value: round.putts ?? 0 },
          { label: 'SHOTS',    value: round.shot_count ?? 0 },
          { label: 'PENALTIES',value: round.total_penalties ?? 0 },
          { label: 'DIFF',     value: round.handicap_differential?.toFixed(1) ?? '—' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="stat-label mb-1">{s.label}</div>
            <div className="text-xl font-black text-[#111]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Shot map */}
        <div className="card p-4">
          <div className="stat-label mb-3">SHOT MAP</div>
          {shots.length > 0 ? (
            <ShotMap shots={shots} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-600">
              No GPS shots logged this round
            </div>
          )}
        </div>

        {/* Scorecard */}
        <div className="card">
          <div className="stat-label p-4 border-b border-[#F0EAE0]">SCORECARD</div>
          {/* Header row */}
          <div className="grid grid-cols-5 gap-0 text-center border-b border-[#F0EAE0] px-4 py-2">
            {['HOLE','PAR','SCORE','GIR','PUTTS'].map(h => (
              <div key={h} className="stat-label">{h}</div>
            ))}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {holeStats.map((h: any) => {
              const diff = (h.score || 0) - (h.par || 4)
              return (
                <div key={h.hole} className="grid grid-cols-5 gap-0 text-center px-4 py-2.5 border-b border-[#F0EAE0]/50 hover:bg-white/[0.02]">
                  <div className="text-gray-500 font-bold">{h.hole}</div>
                  <div className="text-gray-500">{h.par}</div>
                  <div className={`font-black ${
                    diff < -1 ? 'text-[#FFD700]' :
                    diff === -1 ? 'text-[#00E578]' :
                    diff === 0 ? 'text-[#111]' :
                    diff === 1 ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {h.score || '—'}
                  </div>
                  <div>{h.gir ? '✓' : <span className="text-gray-600">—</span>}</div>
                  <div className="text-gray-500">{h.putts || '—'}</div>
                </div>
              )
            })}
          </div>
          {/* Totals */}
          <div className="grid grid-cols-5 gap-0 text-center px-4 py-3 border-t border-[#F0EAE0] bg-[#161616]">
            <div className="stat-label">TOTAL</div>
            <div className="font-black text-gray-500">{par}</div>
            <div className={`font-black text-xl ${scoreDiff <= 0 ? 'text-[#00E578]' : 'text-[#FFD700]'}`}>
              {round.total_score}
            </div>
            <div className="font-bold text-[#00E578]">{round.gir_count}</div>
            <div className="font-bold text-gray-500">{round.putts}</div>
          </div>
        </div>
      </div>

      {/* Weather during round */}
      {round.weather_temp_f && (
        <div className="card p-6 mb-6">
          <div className="stat-label mb-4">CONDITIONS</div>
          <div className="flex gap-8">
            <div><div className="stat-label">TEMP</div><div className="font-black text-[#111]">{round.weather_temp_f}°F</div></div>
            <div><div className="stat-label">WIND</div><div className="font-black text-[#111]">{round.weather_wind_mph} mph</div></div>
            <div><div className="stat-label">CONDITIONS</div><div className="font-black text-[#111]">{round.weather_condition || '—'}</div></div>
          </div>
        </div>
      )}
    </div>
  )
}
