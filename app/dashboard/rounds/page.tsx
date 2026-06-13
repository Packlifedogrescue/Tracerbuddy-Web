'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchRounds } from '@/lib/supabase'
import { useRealtime } from '@/lib/useRealtime'
import { format } from 'date-fns'
import { SlidersHorizontal } from 'lucide-react'

type SortKey = 'date' | 'score' | 'course'
type DateFilter = 'all' | 'month' | '3months' | 'year'

export default function RoundsPage() {
  const [rounds,      setRounds]      = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [sort,        setSort]        = useState<SortKey>('date')
  const [dateFilter,  setDateFilter]  = useState<DateFilter>('all')

  function load() { fetchRounds(200).then(d => { setRounds(d); setLoading(false) }) }
  useEffect(() => { load() }, [])
  const live = useRealtime(['rounds'], load)

  const filtered = rounds.filter(r => {
    if (dateFilter === 'all') return true
    const created = new Date(r.created_at)
    const now = new Date()
    if (dateFilter === 'month')   return created >= new Date(now.getFullYear(), now.getMonth(), 1)
    if (dateFilter === '3months') return created >= new Date(now.getTime() - 90 * 86400000)
    if (dateFilter === 'year')    return created >= new Date(now.getFullYear(), 0, 1)
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'score')  return (a.total_score ?? 999) - (b.total_score ?? 999)
    if (sort === 'course') return (a.course_name ?? '').localeCompare(b.course_name ?? '')
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading rounds…</div>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-black text-[#111] tracking-tight">All Rounds</h1>
            
          </div>
          <p className="text-[13px] text-gray-400 mt-0.5">{filtered.length} of {rounds.length} rounds</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />

          {/* Date filter */}
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-[12px]">
            {([['all','All'], ['month','Month'], ['3months','3 Mo'], ['year','Year']] as [DateFilter, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDateFilter(val)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  dateFilter === val ? 'bg-[#C9A84C] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="text-[12px] bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 font-medium focus:outline-none focus:border-[#C9A84C] cursor-pointer"
          >
            <option value="date">Latest first</option>
            <option value="score">Best score</option>
            <option value="course">Course A–Z</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {sorted.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-4">🏌️</div>
            <p className="text-[14px] font-semibold text-[#111] mb-1">
              {rounds.length === 0 ? 'No rounds yet' : 'No rounds in this period'}
            </p>
            <p className="text-[13px] text-gray-400">
              {rounds.length === 0 ? 'Start tracking in the TracerBuddy app.' : 'Try a different date filter.'}
            </p>
          </div>
        ) : sorted.map((r: any) => {
          const diff = r.handicap_differential
          return (
            <Link key={r.id} href={`/dashboard/rounds/${r.id}`}
              className="flex items-center gap-5 px-5 py-4 hover:bg-gray-50 transition-colors group">

              {/* Date */}
              <div className="w-14 text-center shrink-0">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">{format(new Date(r.created_at), 'MMM')}</div>
                <div className="text-[28px] font-black text-[#111] leading-tight">{format(new Date(r.created_at), 'd')}</div>
                <div className="text-[10px] text-gray-400">{format(new Date(r.created_at), 'yyyy')}</div>
              </div>

              {/* Course + stats */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[#111] truncate">{r.course_name || 'Unknown Course'}</div>
                <div className="flex items-center gap-3 mt-1 text-[11.5px] text-gray-400">
                  <span>{r.gir_count ?? 0}/18 GIR</span>
                  <span>·</span>
                  <span>{r.putts ?? 0} putts</span>
                  <span>·</span>
                  <span>{r.shot_count ?? 0} shots</span>
                  {r.round_mode && r.round_mode !== 'Stroke Play' && (
                    <><span>·</span><span className="text-[#C9A84C] font-medium">{r.round_mode}</span></>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                {(() => {
                  const topar = r.course_par && r.total_score ? r.total_score - r.course_par : null
                  const scoreColor = topar == null ? 'text-[#111]'
                    : topar < 0 ? 'text-[#22A06B]'
                    : topar === 0 ? 'text-[#111]'
                    : topar <= 5 ? 'text-orange-500'
                    : 'text-red-500'
                  return (
                    <>
                      <div className={`text-[32px] font-black leading-none ${scoreColor}`}>{r.total_score ?? '—'}</div>
                      {topar != null && (
                        <div className={`text-[11px] font-bold mt-0.5 ${topar < 0 ? 'text-[#22A06B]' : topar === 0 ? 'text-gray-400' : 'text-red-400'}`}>
                          {topar === 0 ? 'E' : topar > 0 ? `+${topar}` : topar}
                        </div>
                      )}
                      {topar == null && diff != null && (
                        <div className="text-[11px] text-gray-400 mt-0.5">{diff >= 0 ? '+' : ''}{diff.toFixed(1)} diff</div>
                      )}
                    </>
                  )
                })()}
              </div>

              <span className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 text-lg">›</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
