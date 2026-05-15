'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export default function CoachCardsPage() {
  const [cards, setCards]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('coach_cards')
      .select('*, rounds(course_name, created_at, total_score)')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setCards(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Loading coach cards...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Coach Cards</h1>
        <p className="text-gray-500 mt-1">AI-powered round analysis — why you shot that score</p>
      </div>

      {cards.length === 0 ? (
        <div className="card p-16 text-center text-gray-600">
          <div className="text-5xl mb-4">🧠</div>
          No coach cards yet. Complete a round and tap "Get Claude's Full Breakdown" in the app.
        </div>
      ) : cards.map((card: any) => (
        <div key={card.id} className="card mb-4 overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpanded(expanded === card.id ? null : card.id)}
            className="w-full flex items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className="text-3xl">🧠</div>
            <div className="flex-1">
              <div className="font-black text-white">
                {card.rounds?.course_name || 'Unknown Course'}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                {card.rounds?.created_at && format(new Date(card.rounds.created_at), 'MMMM d, yyyy')}
                {card.rounds?.total_score && ` · Score: ${card.rounds.total_score}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[#FFD700] font-black text-lg">
                -{card.strokes_lost?.toFixed(1) ?? '?'} strokes
              </div>
              <div className="text-xs text-gray-500">potential savings</div>
            </div>
            <span className="text-gray-600 ml-2">{expanded === card.id ? '▲' : '▼'}</span>
          </button>

          {/* Expanded content */}
          {expanded === card.id && (
            <div className="border-t border-[#1F1F1F] divide-y divide-[#1F1F1F]">
              {/* Biggest leak */}
              <div className="p-5 bg-red-500/5">
                <div className="text-xs font-black text-red-400 tracking-widest mb-2">TODAY'S BIGGEST LEAK</div>
                <div className="font-bold text-white">{card.biggest_leak}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#1F1F1F]">
                {/* Club misfiring */}
                <div className="p-5">
                  <div className="stat-label mb-2">CLUB REPORT</div>
                  <div className="text-sm text-white mb-1">⚠️ {card.club_misfiring}</div>
                  <div className="text-sm text-gray-400">↔️ {card.miss_pattern}</div>
                  {card.hot_club && <div className="text-sm text-[#FFD700] mt-1">⭐ {card.hot_club}</div>}
                </div>
                {/* Putting */}
                <div className="p-5">
                  <div className="stat-label mb-2">PUTTING</div>
                  <div className="text-sm text-white">{card.putts_analysis}</div>
                </div>
              </div>

              {/* Action plan */}
              <div className="p-5 bg-[#FFD700]/5">
                <div className="text-xs font-black text-[#FFD700] tracking-widest mb-3">ACTION PLAN</div>
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center text-black text-xs font-black shrink-0">1</div>
                    <div className="text-sm text-white">{card.next_round_focus}</div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-black shrink-0">2</div>
                    <div className="text-sm text-white">{card.practice_target}</div>
                  </div>
                </div>
              </div>

              {/* Claude's full analysis */}
              {card.ai_coach_text && (
                <div className="p-5 bg-yellow-500/5">
                  <div className="text-xs font-black text-yellow-400 tracking-widest mb-3">CLAUDE'S ANALYSIS</div>
                  <p className="text-sm text-white leading-relaxed">{card.ai_coach_text}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
