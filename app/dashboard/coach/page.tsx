'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchRounds, fetchClubProfiles } from '@/lib/supabase'
import { format } from 'date-fns'
import { Brain, Sparkles, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

export default function CoachPage() {
  const [cards,    setCards]    = useState<any[]>([])
  const [rounds,   setRounds]   = useState<any[]>([])
  const [clubs,    setClubs]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modal,    setModal]    = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('coach_cards')
        .select('*, rounds(course_name, created_at, total_score, course_par)')
        .order('created_at', { ascending: false })
        .limit(20),
      fetchRounds(30),
      fetchClubProfiles(),
    ]).then(([{ data: c }, r, cl]) => {
      setCards(c || [])
      setRounds(r)
      setClubs(cl)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function generateAnalysis(round: any) {
    setGenerating(round.id)
    setError(null)
    setModal(false)
    try {
      const [{ data: holeStats }] = await Promise.all([
        supabase.from('hole_stats').select('*').eq('round_id', round.id).order('hole'),
      ])

      const res = await fetch('/api/ai/coach', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ round, holeStats: holeStats || [], clubProfiles: clubs }),
      })

      if (!res.ok) throw new Error('Analysis failed')
      const { analysis, error: apiErr } = await res.json()
      if (apiErr) throw new Error(apiErr)

      // Save to Supabase
      const { data: card } = await supabase.from('coach_cards').insert({
        round_id:        round.id,
        biggest_leak:    analysis.biggest_leak,
        club_misfiring:  analysis.club_misfiring,
        miss_pattern:    analysis.miss_pattern,
        hot_club:        analysis.hot_club,
        putts_analysis:  analysis.putts_analysis,
        next_round_focus: analysis.next_round_focus,
        practice_target: analysis.practice_target,
        ai_coach_text:   analysis.ai_coach_text,
        strokes_lost:    analysis.strokes_lost,
      }).select('*, rounds(course_name, created_at, total_score, course_par)').single()

      if (card) setCards(prev => [card, ...prev])
      setExpanded(card?.id ?? null)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading AI Coach…</div>
    </div>
  )

  const existingRoundIds = new Set(cards.map((c: any) => c.round_id))

  return (
    <div className="p-6 md:p-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[26px] font-black text-[#111] tracking-tight">AI Coach</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Claude analyses your round and tells you exactly what to fix
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E87830] text-white rounded-xl text-[13px] font-bold hover:bg-[#d06a20] transition-colors shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Analyse a Round
        </button>
      </div>

      {/* Generating banner */}
      {generating && (
        <div className="mb-5 flex items-center gap-3 bg-[#FEF3E8] border border-[#E87830]/20 rounded-2xl px-5 py-4">
          <Loader2 className="w-4 h-4 text-[#E87830] animate-spin shrink-0" />
          <span className="text-[13px] font-medium text-[#E87830]">
            Claude is analysing your round — this takes about 10 seconds…
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <span className="text-[13px] text-red-500">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* Cards */}
      {cards.length === 0 && !generating ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <Brain className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-[14px] font-semibold text-[#111] mb-1">No analyses yet</p>
          <p className="text-[13px] text-gray-400 mb-5">
            Tap "Analyse a Round" to get Claude's breakdown of any round you've played.
          </p>
          <button
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E87830] text-white rounded-xl text-[13px] font-bold hover:bg-[#d06a20] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyse your first round
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card: any) => {
            const isOpen  = expanded === card.id
            const toPar   = card.rounds?.total_score && card.rounds?.course_par
              ? card.rounds.total_score - card.rounds.course_par : null
            return (
              <div key={card.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : card.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3E8] flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5 text-[#E87830]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-[#111] truncate">
                      {card.rounds?.course_name || 'Unknown Course'}
                    </div>
                    <div className="text-[12px] text-gray-400 mt-0.5">
                      {card.rounds?.created_at && format(new Date(card.rounds.created_at), 'MMMM d, yyyy')}
                      {card.rounds?.total_score && ` · Score ${card.rounds.total_score}`}
                      {toPar != null && ` (${toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : toPar})`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[18px] font-black text-[#C9A84C]">
                      -{card.strokes_lost?.toFixed(1) ?? '?'}
                    </div>
                    <div className="text-[10px] text-gray-400">strokes lost</div>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100">
                    {/* Biggest leak */}
                    <div className="px-5 py-4 bg-red-50">
                      <div className="text-[10px] font-black text-red-400 tracking-widest uppercase mb-1.5">
                        Biggest Leak
                      </div>
                      <p className="text-[13.5px] font-semibold text-[#111]">{card.biggest_leak}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                      {/* Club */}
                      <div className="px-5 py-4">
                        <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">
                          Club Report
                        </div>
                        <p className="text-[13px] text-[#111] mb-1">⚠️ {card.club_misfiring}</p>
                        <p className="text-[13px] text-gray-500">↔️ {card.miss_pattern}</p>
                        {card.hot_club && (
                          <p className="text-[13px] text-[#C9A84C] mt-1">⭐ {card.hot_club}</p>
                        )}
                      </div>
                      {/* Putting */}
                      <div className="px-5 py-4">
                        <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">
                          Putting
                        </div>
                        <p className="text-[13px] text-[#111]">{card.putts_analysis}</p>
                      </div>
                    </div>

                    {/* Action plan */}
                    <div className="px-5 py-4 bg-[#FEF3E8] border-t border-gray-100">
                      <div className="text-[10px] font-black text-[#E87830] tracking-widest uppercase mb-3">
                        Action Plan
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#E87830] flex items-center justify-center text-white text-[11px] font-black shrink-0">1</div>
                          <p className="text-[13px] text-[#111]">{card.next_round_focus}</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-[11px] font-black shrink-0">2</div>
                          <p className="text-[13px] text-[#111]">{card.practice_target}</p>
                        </div>
                      </div>
                    </div>

                    {/* Full analysis */}
                    {card.ai_coach_text && (
                      <div className="px-5 py-4 border-t border-gray-100">
                        <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">
                          Full Analysis
                        </div>
                        <p className="text-[13px] text-gray-600 leading-relaxed">{card.ai_coach_text}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Round picker modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-[16px] font-black text-[#111]">Choose a Round</h2>
                <p className="text-[12px] text-gray-400 mt-0.5">Pick a round for Claude to analyse</p>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {rounds.filter(r => !existingRoundIds.has(r.id) && r.total_score).length === 0 ? (
                <div className="p-8 text-center text-[13px] text-gray-400">
                  All your rounds have been analysed already.
                </div>
              ) : rounds.filter(r => !existingRoundIds.has(r.id) && r.total_score).map((r: any) => {
                const toPar = r.course_par ? r.total_score - r.course_par : null
                return (
                  <button
                    key={r.id}
                    onClick={() => generateAnalysis(r)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left"
                  >
                    <div className="w-10 text-center shrink-0">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">
                        {format(new Date(r.created_at), 'MMM')}
                      </div>
                      <div className="text-[22px] font-black text-[#111] leading-tight">
                        {format(new Date(r.created_at), 'd')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-[#111] truncate">
                        {r.course_name || 'Unknown Course'}
                      </div>
                      <div className="text-[11.5px] text-gray-400 mt-0.5">
                        {r.gir_count ?? 0}/18 GIR · {r.putts ?? 0} putts
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[22px] font-black text-[#111]">{r.total_score}</div>
                      {toPar != null && (
                        <div className={`text-[11px] font-bold ${toPar < 0 ? 'text-green-500' : toPar === 0 ? 'text-gray-400' : 'text-red-400'}`}>
                          {toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : toPar}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
