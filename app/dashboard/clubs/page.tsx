'use client'
import { useEffect, useState } from 'react'
import { fetchClubProfiles } from '@/lib/supabase'

export default function ClubsPage() {
  const [clubs, setClubs]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchClubProfiles().then(d => { setClubs(d); setLoading(false) }) }, [])

  function confidenceInfo(shots: number, stdDev: number | null) {
    if (shots < 5)                          return { label: 'Building…', color: '#9CA3AF', pct: 0.2  }
    if (stdDev === null)                    return { label: 'Building…', color: '#9CA3AF', pct: 0.2  }
    if (stdDev < 8)                         return { label: 'High',      color: '#22C55E', pct: 0.92 }
    if (stdDev < 15)                        return { label: 'Medium',    color: '#F59E0B', pct: 0.58 }
    return                                         { label: 'Low',       color: '#EF4444', pct: 0.28 }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading clubs…</div>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-7">
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">Club Confidence</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Your real playing numbers — not what you think you hit</p>
      </div>

      {clubs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="text-5xl mb-4">🏌️</div>
          <p className="text-[14px] font-semibold text-[#111] mb-1">No club data yet</p>
          <p className="text-[13px] text-gray-400">Log shots in the TracerBuddy app to build your profiles.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clubs.map((club: any) => {
            const stdDev = club.std_dev ?? club.yards_std_dev ?? null
            const conf   = confidenceInfo(club.shot_count, stdDev)
            return (
              <div key={club.club_name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-5">

                  {/* Club name */}
                  <div className="w-20 shrink-0">
                    <div className="text-[17px] font-black text-[#111]">{club.club_name}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{club.shot_count} shots</div>
                  </div>

                  {/* Avg yards */}
                  <div className="text-center shrink-0 w-20">
                    <div className="text-[36px] font-black text-[#C9A84C] leading-none">
                      {Math.round(club.avg_yards)}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 tracking-wider mt-0.5">AVG YARDS</div>
                  </div>

                  {/* Confidence bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-bold" style={{ color: conf.color }}>
                        {conf.label} Confidence
                      </span>
                      {stdDev !== null && club.shot_count >= 5 && (
                        <span className="text-[11px] text-gray-400">±{Math.round(stdDev)}y spread</span>
                      )}
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${conf.pct * 100}%`, background: conf.color }}
                      />
                    </div>
                  </div>

                  {/* Miss pattern */}
                  <div className="w-28 text-right shrink-0 space-y-0.5">
                    {club.fade_pct > 25 && (
                      <div className="text-[11.5px] text-blue-500 font-medium">{Math.round(club.fade_pct)}% fade</div>
                    )}
                    {club.draw_pct > 25 && (
                      <div className="text-[11.5px] text-orange-500 font-medium">{Math.round(club.draw_pct)}% draw</div>
                    )}
                    {club.shot_count >= 5 && (
                      <div className="text-[11px] text-gray-400">Play {Math.round(club.avg_yards)}y</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
