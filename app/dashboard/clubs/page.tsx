'use client'
import { useEffect, useState } from 'react'
import { fetchClubProfiles } from '@/lib/supabase'

export default function ClubsPage() {
  const [clubs, setClubs]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchClubProfiles().then(d => { setClubs(d); setLoading(false) }) }, [])

  function confidenceInfo(shots: number, stdDev: number) {
    if (shots < 5) return { label: 'Building...', color: '#666',    pct: 0.25 }
    if (stdDev < 8) return { label: 'High ✅',    color: '#00E578', pct: 0.9  }
    if (stdDev < 15) return { label: 'Medium ⚠️', color: '#FFD700', pct: 0.6  }
    return             { label: 'Low ❌',          color: '#EF4444', pct: 0.3  }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading clubs...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Club Confidence</h1>
        <p className="text-gray-500 mt-1">Your real playing numbers — not what you think you hit</p>
      </div>

      {clubs.length === 0 ? (
        <div className="card p-16 text-center text-gray-600">
          <div className="text-5xl mb-4">🏌️</div>
          No club data yet. Log shots in the app to build your profiles.
        </div>
      ) : (
        <div className="space-y-3">
          {clubs.map((club: any) => {
            const conf = confidenceInfo(club.shot_count, 12)
            const deviation = 12  // placeholder until we calc from shots
            return (
              <div key={club.club_name} className="card p-6 hover:border-[#FFD700]/20 transition-colors">
                <div className="flex items-center gap-6">
                  {/* Club name */}
                  <div className="w-20">
                    <div className="text-xl font-black text-white">{club.club_name}</div>
                    <div className="text-xs text-gray-500">{club.shot_count} shots</div>
                  </div>
                  {/* Real number */}
                  <div className="text-center">
                    <div className="text-4xl font-black text-[#FFD700]">
                      {Math.round(club.avg_yards)}
                    </div>
                    <div className="stat-label">REAL YARDS</div>
                  </div>
                  {/* Confidence bar */}
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold" style={{ color: conf.color }}>
                        {conf.label}
                      </span>
                      <span className="text-xs text-gray-500">±{deviation}y range</span>
                    </div>
                    <div className="h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${conf.pct*100}%`, background: conf.color }}
                      />
                    </div>
                  </div>
                  {/* Miss pattern */}
                  <div className="w-32 text-right">
                    {club.fade_pct > 25 && (
                      <div className="text-xs text-blue-400">{Math.round(club.fade_pct)}% fade</div>
                    )}
                    {club.draw_pct > 25 && (
                      <div className="text-xs text-orange-400">{Math.round(club.draw_pct)}% draw</div>
                    )}
                    {club.avg_yards > 0 && club.shot_count >= 5 && (
                      <div className="text-xs text-gray-600 mt-1">
                        Play {Math.round(club.avg_yards)}y
                      </div>
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
