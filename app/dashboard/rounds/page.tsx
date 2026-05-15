'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchRounds } from '@/lib/supabase'
import { format } from 'date-fns'

export default function RoundsPage() {
  const [rounds, setRounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchRounds(50).then(d => { setRounds(d); setLoading(false) }) }, [])

  if (loading) return <div className="p-8 text-gray-500">Loading rounds...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">All Rounds</h1>
        <p className="text-gray-500 mt-1">{rounds.length} rounds tracked</p>
      </div>

      <div className="card divide-y divide-[#1F1F1F]">
        {rounds.length === 0 ? (
          <div className="p-16 text-center text-gray-600">
            <div className="text-5xl mb-4">🏌️</div>
            No rounds yet. Start tracking in the TracerBuddy app.
          </div>
        ) : rounds.map((r: any) => {
          const diff = r.handicap_differential
          return (
            <Link key={r.id} href={`/dashboard/rounds/${r.id}`}
              className="flex items-center gap-5 p-5 hover:bg-white/[0.02] transition-colors">
              {/* Date block */}
              <div className="w-16 text-center shrink-0">
                <div className="text-xs text-gray-500 uppercase">{format(new Date(r.created_at),'MMM')}</div>
                <div className="text-3xl font-black text-white leading-tight">{format(new Date(r.created_at),'d')}</div>
                <div className="text-xs text-gray-600">{format(new Date(r.created_at),'yyyy')}</div>
              </div>

              {/* Course + stats */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{r.course_name || 'Unknown Course'}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{r.gir_count ?? 0} GIR</span>
                  <span>·</span>
                  <span>{r.putts ?? 0} putts</span>
                  <span>·</span>
                  <span>{r.shot_count ?? 0} shots</span>
                  {r.round_mode && r.round_mode !== 'Stroke Play' && (
                    <><span>·</span><span className="text-[#FFD700]">{r.round_mode}</span></>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <div className="text-4xl font-black text-white">{r.total_score}</div>
                {diff != null && (
                  <div className="text-xs text-gray-500">+{diff.toFixed(1)} diff</div>
                )}
              </div>

              <span className="text-gray-700 shrink-0">›</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
