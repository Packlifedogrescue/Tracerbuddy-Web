'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminCourses() {
  const [courses,  setCourses]  = useState<any[]>([])
  const [total,    setTotal]    = useState(0)
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [email,    setEmail]    = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user?.email) setEmail(user.email) })
  }, [])

  const load = useCallback(async () => {
    if (!email) return
    setLoading(true); setError(null)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res  = await fetch(`/api/admin/courses?${params}`, { headers: { 'x-admin-email': email } })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setCourses(data.courses ?? []); setTotal(data.total ?? 0); setLoading(false)
  }, [email, search])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Courses</h1>
          <p className="text-gray-500 text-sm mt-1">{total} unique courses played</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
            className="bg-[#161616] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 w-64 focus:outline-none focus:border-[#DF9905]/50" />
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">Error: {error}</p>}
      <div className="bg-[#161616] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Course</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Rounds</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Avg Score</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Last Played</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="text-center py-12">
              <div className="w-5 h-5 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin mx-auto" />
            </td></tr>}
            {!loading && courses.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-gray-600 text-sm">No courses found</td></tr>}
            {!loading && courses.map(c => (
              <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-white font-medium">{c.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-[#DF9905] font-semibold">{c.roundCount}</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-300">{c.avgScore ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {c.lastPlayed ? format(new Date(c.lastPlayed), 'MMM d, yyyy') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
