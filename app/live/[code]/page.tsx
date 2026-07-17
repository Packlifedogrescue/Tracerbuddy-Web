'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, RadioTower } from 'lucide-react'

interface Participant {
  user_id: string
  display_name: string
  handicap: number
  scores: Record<string, number>
}

interface LiveRound {
  id: string
  course_name: string | null
  round_mode: string
  status: string
  created_at: string
}

const POLL_MS = 15000
const HOLES = Array.from({ length: 18 }, (_, i) => i + 1)

function totals(p: Participant) {
  const entries = Object.values(p.scores ?? {})
  return {
    total: entries.reduce((a, b) => a + b, 0),
    thru:  entries.length,
  }
}

export default function LiveRoundPage() {
  const { code } = useParams<{ code: string }>()
  const [round,        setRound]        = useState<LiveRound | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [state,        setState]        = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [updatedAt,    setUpdatedAt]    = useState<Date | null>(null)

  const fetchRound = useCallback(async () => {
    try {
      const res = await fetch(`/api/round/live?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      if (res.status === 404) { setState('notfound'); return }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRound(data.liveRound)
      setParticipants(data.participants ?? [])
      setUpdatedAt(new Date())
      setState('ready')
    } catch {
      // Keep showing the last good data if we already have it
      setState(prev => (prev === 'ready' ? 'ready' : 'error'))
    }
  }, [code])

  useEffect(() => {
    fetchRound()
    const id = setInterval(() => {
      if (!document.hidden) fetchRound()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [fetchRound])

  const isLive = round?.status === 'active'
  const sorted = [...participants].sort((a, b) => {
    const ta = totals(a), tb = totals(b)
    if (ta.thru === 0 && tb.thru === 0) return 0
    if (ta.thru === 0) return 1
    if (tb.thru === 0) return -1
    return ta.total - tb.total
  })

  return (
    <div className="bg-[#F5EFE0] text-[#1A1A1A] min-h-screen font-sans">
      <nav className="border-b border-black/[0.04]">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-[1100px] mx-auto">
          <Link href="/">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-12 w-auto mix-blend-multiply" />
          </Link>
          {state === 'ready' && (
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-wide">
              {isLive ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E03E3E] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E03E3E]" />
                  </span>
                  <span className="text-[#E03E3E]">LIVE</span>
                </>
              ) : (
                <span className="text-[#888] border border-black/10 rounded-full px-3 py-1">FINAL</span>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="px-4 md:px-12 py-8 max-w-[1100px] mx-auto">

        {state === 'loading' && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-[#DF9905] animate-spin" />
          </div>
        )}

        {(state === 'notfound' || state === 'error') && (
          <div className="text-center py-24 max-w-[360px] mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-5">
              <RadioTower className="w-6 h-6 text-[#DF9905]" />
            </div>
            <h1 className="font-serif text-[26px] font-medium mb-2">
              {state === 'notfound' ? 'Round not found' : 'Something went wrong'}
            </h1>
            <p className="text-[13.5px] text-[#666] leading-[1.6] mb-6">
              {state === 'notfound'
                ? `No round matches the code “${code}”. Double-check the code with whoever shared it.`
                : 'Could not load the round. It may be a temporary issue.'}
            </p>
            <Link href="/live" className="inline-block bg-[#1A1A1A] text-[#F5EFE0] font-semibold text-[14px] rounded-xl px-6 py-3 hover:bg-black transition-colors">
              Try another code
            </Link>
          </div>
        )}

        {state === 'ready' && round && (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-2">LIVE ROUND · {String(code).toUpperCase()}</div>
              <h1 className="font-serif text-[30px] md:text-[40px] font-medium tracking-[-0.02em] leading-[1.1]">
                {round.course_name || 'Golf Round'}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-[12.5px] text-[#888]">
                <span className="capitalize">{round.round_mode} play</span>
                <span>·</span>
                <span>{participants.length} player{participants.length !== 1 ? 's' : ''}</span>
                {updatedAt && (
                  <>
                    <span>·</span>
                    <span>Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
                  </>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-[#1A1A1A] text-[#F5EFE0] rounded-2xl overflow-hidden mb-5">
              {sorted.map((p, i) => {
                const t = totals(p)
                return (
                  <div key={p.user_id} className="flex items-center gap-4 px-5 md:px-7 py-4 border-b border-white/[0.06] last:border-0">
                    <div className="font-serif text-[20px] font-medium text-[#DF9905] w-7 shrink-0 text-center">
                      {t.thru > 0 ? i + 1 : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold truncate">{p.display_name}</div>
                      <div className="text-[11px] text-[#888] mt-0.5">HCP {p.handicap}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-serif text-[26px] font-medium leading-none">{t.thru > 0 ? t.total : '·'}</div>
                      <div className="text-[10px] text-[#888] mt-1 tracking-wide font-semibold">
                        {t.thru > 0 ? `THRU ${t.thru}` : 'NOT STARTED'}
                      </div>
                    </div>
                  </div>
                )
              })}
              {sorted.length === 0 && (
                <div className="px-7 py-10 text-center text-[13px] text-[#888]">No players yet.</div>
              )}
            </div>

            {/* Hole-by-hole grid */}
            {sorted.some(p => totals(p).thru > 0) && (
              <div className="bg-white border border-black/[0.05] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-[#999] border-b border-black/[0.05]">
                  Hole by Hole
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-white text-left text-[10px] font-bold uppercase tracking-wider text-[#999] px-5 py-2.5 border-b border-black/[0.05]">Player</th>
                        {HOLES.map(h => (
                          <th key={h} className="text-center text-[10px] font-bold text-[#999] px-2 py-2.5 border-b border-black/[0.05] min-w-[34px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(p => (
                        <tr key={p.user_id} className="border-b border-black/[0.04] last:border-0">
                          <td className="sticky left-0 bg-white text-[12.5px] font-semibold px-5 py-2.5 whitespace-nowrap">{p.display_name}</td>
                          {HOLES.map(h => {
                            const s = p.scores?.[String(h)]
                            return (
                              <td key={h} className="text-center text-[12.5px] px-2 py-2.5 text-[#333] font-medium">
                                {s ?? <span className="text-[#ddd]">·</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-center text-[11.5px] text-[#999] mt-8">
              {isLive ? `Scores refresh automatically every ${POLL_MS / 1000} seconds.` : 'This round has ended.'}
              {' '}Tracked with <Link href="/" className="text-[#DF9905] hover:underline">TracerBuddy</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
