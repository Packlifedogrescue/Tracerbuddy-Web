'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

function toPar(score: number, par: number) {
  const diff = score - par
  if (diff === 0) return <span className="text-gray-400">E</span>
  if (diff > 0)  return <span className="text-red-400">+{diff}</span>
  return <span className="text-green-400">{diff}</span>
}

export default function AdminRounds() {
  const [rounds,  setRounds]  = useState<any[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [email,   setEmail]   = useState('')
  const limit = 25

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  const load = useCallback(async () => {
    if (!email) return
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res  = await fetch(`/api/admin/rounds?${params}`, { headers: { 'x-admin-email': email } })
    const data = await res.json()
    setRounds(data.rounds ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [email, page])

  useEffect(() => { load() }, [load])

  async function deleteRound(roundId: string, course: string) {
    if (!confirm(`Delete round at "${course}"? This cannot be undone.`)) return
    await fetch('/api/admin/rounds', {
      method: 'DELETE',
      headers: { 'x-admin-email': email, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId }),
    })
    load()
  }

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rounds</h1>
        <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} total rounds logged</p>
      </div>

      <div className="bg-[#161616] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Player</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Course</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Score</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">+/-</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">GIR</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Putts</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <div className="w-5 h-5 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {!loading && rounds.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-600 text-sm">No rounds found</td>
              </tr>
            )}
            {!loading && rounds.map(r => (
              <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <div className="text-white font-medium text-xs">{r.user_profiles?.display_name || 'Unknown'}</div>
                  <div className="text-gray-600 text-[11px]">{r.user_profiles?.email || '—'}</div>
                </td>
                <td className="px-4 py-3 text-gray-300 max-w-[160px] truncate">{r.course_name || '—'}</td>
                <td className="px-4 py-3 text-center text-white font-bold">{r.total_score ?? '—'}</td>
                <td className="px-4 py-3 text-center font-medium">
                  {r.total_score && r.course_par ? toPar(r.total_score, r.course_par) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-gray-400">{r.gir_count ?? '—'}</td>
                <td className="px-4 py-3 text-center text-gray-400">{r.putts ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {r.played_at ? format(new Date(r.played_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteRound(r.id, r.course_name)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="border-t border-white/[0.06] px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {page} of {pages} · {total.toLocaleString()} rounds
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
