'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Trophy, TrendingUp } from 'lucide-react'

export default function TournamentPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('tournament_results')
      .select('*, rounds(course_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setResults(data || []); setLoading(false) })
  }, [])

  const wins            = results.filter(r => r.result === 'Won').length
  const losses          = results.filter(r => r.result === 'Lost').length
  const total           = wins + losses
  const winRate         = total > 0 ? Math.round((wins / total) * 100) : 0
  const bestStableford  = results.length ? Math.max(...results.map(r => r.stableford_points || 0)) : 0

  if (loading) return <div className="p-8 text-gray-400">Loading tournaments...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#111]">Tournament Results</h1>
        <p className="text-gray-500 text-sm mt-0.5">Match play, Stableford, and competition history</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'WINS',            value: wins,           color: '#22A06B' },
          { label: 'LOSSES',          value: losses,         color: '#EF4444' },
          { label: 'WIN RATE',        value: `${winRate}%`,  color: '#C9A84C' },
          { label: 'BEST STABLEFORD', value: bestStableford || '—', color: '#111' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{s.label}</div>
            <div className="text-4xl font-black leading-none" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Win/loss bar */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">WIN / LOSS RECORD</div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            <div
              className="bg-[#22A06B] rounded-full transition-all"
              style={{ width: `${winRate}%` }}
            />
            <div
              className="bg-red-300 rounded-full transition-all flex-1"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{wins}W</span>
            <span>{losses}L</span>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F8F4EE] flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-6 h-6 text-[#C9A84C]" />
          </div>
          <p className="text-gray-500 text-sm">No tournament rounds yet. Switch to Match Play or Stableford mode in the app.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {results.map((r: any) => {
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
                  <div className="font-bold text-[#111] truncate">{r.rounds?.course_name || 'Unknown'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {r.round_mode} · {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {r.round_mode === 'Match Play' ? (
                    <div className="text-sm font-bold text-[#111]">
                      {r.match_holes_won}W / {r.match_holes_lost}L / {r.match_holes_tied}H
                    </div>
                  ) : (
                    <div className="text-base font-black text-[#C9A84C]">{r.stableford_points} pts</div>
                  )}
                  <div className={`text-xs font-bold mt-0.5 ${won ? 'text-[#22A06B]' : lost ? 'text-red-400' : 'text-gray-400'}`}>
                    {r.result}
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
