'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export default function TournamentPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('tournament_results')
      .select('*, rounds(course_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setResults(data || []); setLoading(false) })
  }, [])

  const wins   = results.filter(r => r.result === 'Won').length
  const losses = results.filter(r => r.result === 'Lost').length
  const bestStableford = results.length ? Math.max(...results.map(r => r.stableford_points || 0)) : 0

  if (loading) return <div className="p-8 text-gray-500">Loading tournaments...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#111]">Tournament Results</h1>
        <p className="text-gray-500 mt-1">Match play, Stableford, and tournament history</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5 text-center">
          <div className="stat-label mb-2">MATCH WINS</div>
          <div className="text-4xl font-black text-[#00E578]">{wins}</div>
        </div>
        <div className="card p-5 text-center">
          <div className="stat-label mb-2">MATCH LOSSES</div>
          <div className="text-4xl font-black text-red-400">{losses}</div>
        </div>
        <div className="card p-5 text-center">
          <div className="stat-label mb-2">BEST STABLEFORD</div>
          <div className="text-4xl font-black text-[#FFD700]">{bestStableford || '—'}</div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="card p-16 text-center text-gray-600">
          <div className="text-5xl mb-4">🏆</div>
          No tournament rounds yet. Switch to Match Play or Stableford mode in the app.
        </div>
      ) : (
        <div className="card divide-y divide-[#1F1F1F]">
          {results.map((r: any) => (
            <div key={r.id} className="flex items-center gap-4 p-5">
              <div className="text-2xl">
                {r.result === 'Won' ? '🏆' : r.result === 'Lost' ? '😤' : '🤝'}
              </div>
              <div className="flex-1">
                <div className="font-bold text-[#111]">{r.rounds?.course_name || 'Unknown'}</div>
                <div className="text-xs text-gray-500">
                  {r.round_mode} · {format(new Date(r.created_at), 'MMM d, yyyy')}
                </div>
              </div>
              <div className="text-right">
                {r.round_mode === 'Match Play' ? (
                  <div className="font-bold text-[#111]">
                    {r.match_holes_won}W / {r.match_holes_lost}L / {r.match_holes_tied}H
                  </div>
                ) : (
                  <div className="font-black text-[#FFD700]">{r.stableford_points} pts</div>
                )}
                <div className={`text-sm font-bold ${r.result === 'Won' ? 'text-[#00E578]' : r.result === 'Lost' ? 'text-red-400' : 'text-gray-500'}`}>
                  {r.result}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
