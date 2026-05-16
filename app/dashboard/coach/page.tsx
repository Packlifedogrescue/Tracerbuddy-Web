'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Brain, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

export default function CoachCardsPage() {
  const [cards,    setCards]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('coach_cards')
      .select('*, rounds(course_name, created_at, total_score)')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setCards(data || []); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading coach cards…</div>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">AI Coach</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Round-by-round breakdown — why you shot that score</p>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#F8F4EE] flex items-center justify-center mx-auto mb-4">
            <Brain className="w-7 h-7 text-[#C9A84C]" />
          </div>
          <p className="text-[14px] font-semibold text-[#111] mb-1">No coach cards yet</p>
          <p className="text-[13px] text-gray-400">
            Complete a round and tap "Get AI Analysis" in the TracerBuddy app.
          </p>
        </div>
      ) : cards.map((card: any) => (
        <div key={card.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === card.id ? null : card.id)}
            className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#F8F4EE] flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-[#C9A84C]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-[#111] truncate">
                {card.rounds?.course_name || 'Unknown Course'}
              </div>
              <div className="text-[12px] text-gray-400 mt-0.5">
                {card.rounds?.created_at && format(new Date(card.rounds.created_at), 'MMMM d, yyyy')}
                {card.rounds?.total_score && ` · Score ${card.rounds.total_score}`}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[#C9A84C] font-black text-[15px]">
                -{card.strokes_lost?.toFixed(1) ?? '?'} strokes
              </div>
              <div className="text-[10px] text-gray-400">potential savings</div>
            </div>
            <div className="ml-2 text-gray-300">
              {expanded === card.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {expanded === card.id && (
            <div className="border-t border-gray-100">
              {/* Biggest leak */}
              {card.biggest_leak && (
                <div className="p-5 bg-red-50 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Today's Biggest Leak</div>
                    <div className="text-[13.5px] font-semibold text-[#111]">{card.biggest_leak}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                <div className="p-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Club Report</div>
                  {card.club_misfiring && (
                    <div className="text-[13px] text-[#111] mb-1 flex items-center gap-1.5">
                      <span className="text-orange-400 font-bold">!</span> {card.club_misfiring}
                    </div>
                  )}
                  {card.miss_pattern && (
                    <div className="text-[13px] text-gray-500 mb-1">{card.miss_pattern}</div>
                  )}
                  {card.hot_club && (
                    <div className="text-[13px] text-[#22A06B] font-semibold mt-1">✓ Hot: {card.hot_club}</div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Putting</div>
                  <div className="text-[13px] text-[#111]">{card.putts_analysis}</div>
                </div>
              </div>

              {/* Action plan */}
              <div className="p-5 bg-[#F8F4EE] border-t border-gray-100">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9A84C] mb-3">Action Plan</div>
                <div className="space-y-2.5">
                  {card.next_round_focus && (
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-xs font-black shrink-0">1</div>
                      <div className="text-[13px] text-[#111] pt-0.5">{card.next_round_focus}</div>
                    </div>
                  )}
                  {card.practice_target && (
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-[#22A06B] flex items-center justify-center text-white text-xs font-black shrink-0">2</div>
                      <div className="text-[13px] text-[#111] pt-0.5">{card.practice_target}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Full analysis */}
              {card.ai_coach_text && (
                <div className="p-5 border-t border-gray-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Full AI Analysis</div>
                  <p className="text-[13px] text-[#111] leading-relaxed">{card.ai_coach_text}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
