'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Trophy } from 'lucide-react'
import ProGate from '@/components/ProGate'

// "Tournament results" isn't a table the app writes on its own — match play win/loss
// and Stableford points already live on rounds (match_holes_won/lost/tied) and
// hole_stats (per-hole stableford_points), so this is derived from those instead of a
// separate table that was never populated.
const TOURNAMENT_MODES = ['Match Play', 'Stableford', 'Skins', 'Best Ball', 'Tournament']

interface TournamentRound {
  id: string
  course_name: string
  created_at: string
  round_mode: string
  match_holes_won: number | null
  match_holes_lost: number | null
  match_holes_tied: number | null
  stableford_points: number | null
  result: 'Won' | 'Lost' | 'Tied' | null
}

export default function TournamentPage() {
  const [results, setResults] = useState<TournamentRound[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('rounds')
      .select('id, course_name, created_at, round_mode, match_holes_won, match_holes_lost, match_holes_tied')
      .in('round_mode', TOURNAMENT_MODES)
      .order('created_at', { ascending: false })
      .then(async ({ data: rounds }) => {
        const list = rounds || []
        if (list.length === 0) { setResults([]); setLoading(false); return }

        // Stableford points aren't stored on the round itself — sum them from hole_stats.
        const roundIds = list.map(r => r.id)
        const { data: holeStats } = await supabase
          .from('hole_stats')
          .select('round_id, stableford_points')
          .in('round_id', roundIds)
        const pointsByRound: Record<string, number> = {}
        for (const h of holeStats || []) {
          pointsByRound[h.round_id] = (pointsByRound[h.round_id] || 0) + (h.stableford_points || 0)
        }

        const merged: TournamentRound[] = list.map(r => {
          let result: TournamentRound['result'] = null
          if (r.round_mode === 'Match Play') {
            const won  = r.match_holes_won  ?? 0
            const lost = r.match_holes_lost ?? 0
            result = won > lost ? 'Won' : lost > won ? 'Lost' : 'Tied'
          }
          return { ...r, stableford_points: pointsByRound[r.id] ?? null, result }
        })
        setResults(merged)
        setLoading(false)
      })
  }, [])

  const matchRounds     = results.filter(r => r.round_mode === 'Match Play')
  const wins            = matchRounds.filter(r => r.result === 'Won').length
  const losses          = matchRounds.filter(r => r.result === 'Lost').length
  const totalDecided    = wins + losses
  const winRate         = totalDecided > 0 ? Math.round((wins / totalDecided) * 100) : 0
  const stablefordRounds = results.filter(r => r.stableford_points != null)
  const bestStableford  = stablefordRounds.length ? Math.max(...stablefordRounds.map(r => r.stableford_points || 0)) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading tournaments…</div>
    </div>
  )

  return (
    <ProGate feature="Tournament Results" description="Track your match play, Stableford, and tournament history — wins, losses, and your best performances.">
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">Tournament Results</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Match play, Stableford, and competition history</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Wins',            value: wins,                  color: '#22A06B' },
          { label: 'Losses',          value: losses,                color: '#EF4444' },
          { label: 'Win Rate',        value: `${winRate}%`,         color: '#C9A84C' },
          { label: 'Best Stableford', value: bestStableford || '—', color: '#111'    },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
            <div className="text-[36px] font-black leading-none" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Win/loss bar */}
      {totalDecided > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Win / Loss Record</div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            <div className="bg-[#22A06B] rounded-full transition-all" style={{ width: `${winRate}%` }} />
            <div className="bg-red-200 rounded-full transition-all flex-1" />
          </div>
          <div className="flex justify-between mt-2 text-[11.5px] font-semibold">
            <span className="text-[#22A06B]">{wins} W</span>
            <span className="text-red-400">{losses} L</span>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F8F4EE] flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-6 h-6 text-[#C9A84C]" />
          </div>
          <p className="text-[14px] font-semibold text-[#111] mb-1">No tournament rounds yet</p>
          <p className="text-[13px] text-gray-400">Switch to Match Play or Stableford mode in the app.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {results.map((r) => {
            const won  = r.result === 'Won'
            const lost = r.result === 'Lost'
            return (
              <div key={r.id} className="flex items-center gap-4 p-5 border-b border-gray-50 last:border-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  won ? 'bg-[#22A06B]/10' : lost ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <Trophy className={`w-4 h-4 ${won ? 'text-[#22A06B]' : lost ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-[#111] truncate">
                    {r.course_name || 'Unknown'}
                  </div>
                  <div className="text-[12px] text-gray-400 mt-0.5">
                    {r.round_mode} · {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {r.round_mode === 'Match Play' ? (
                    <div className="text-[13.5px] font-bold text-[#111]">
                      {r.match_holes_won}W / {r.match_holes_lost}L / {r.match_holes_tied}H
                    </div>
                  ) : (
                    <div className="text-[18px] font-black text-[#C9A84C]">
                      {r.stableford_points != null ? `${r.stableford_points} pts` : '—'}
                    </div>
                  )}
                  {r.result && (
                    <div className={`text-[11.5px] font-bold mt-0.5 ${
                      won ? 'text-[#22A06B]' : lost ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {r.result}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
    </ProGate>
  )
}
