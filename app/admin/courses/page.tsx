'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Pencil, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'

type Course = {
  id: string
  name: string
  city: string
  state: string
  country: string
  par: number
  course_rating: number
  slope_rating: number
  created_at: string
}

export default function AdminCourses() {
  const [courses,  setCourses]  = useState<Course[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [email,    setEmail]    = useState('')
  const [editing,  setEditing]  = useState<string | null>(null)
  const [editVals, setEditVals] = useState<Partial<Course>>({})
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
    if (search) params.set('search', search)
    const res  = await fetch(`/api/admin/courses?${params}`, { headers: { 'x-admin-email': email } })
    const data = await res.json()
    setCourses(data.courses ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [email, page, search])

  useEffect(() => { load() }, [load])

  function startEdit(c: Course) {
    setEditing(c.id)
    setEditVals({ name: c.name, city: c.city, state: c.state, par: c.par, course_rating: c.course_rating, slope_rating: c.slope_rating })
  }

  async function saveEdit(id: string) {
    await fetch('/api/admin/courses', {
      method: 'PATCH',
      headers: { 'x-admin-email': email, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editVals }),
    })
    setEditing(null)
    load()
  }

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Courses</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} courses in database</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search courses..."
            className="bg-[#161616] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 w-64 focus:outline-none focus:border-[#DF9905]/50"
          />
        </div>
      </div>

      <div className="bg-[#161616] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Course</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Location</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Par</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Rating</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Slope</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="w-5 h-5 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {!loading && courses.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-600 text-sm">No courses found</td>
              </tr>
            )}
            {!loading && courses.map(c => {
              const isEditing = editing === c.id
              return (
                <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    {isEditing ? (
                      <input
                        value={editVals.name ?? ''}
                        onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                        className="bg-[#1E1E1E] border border-[#DF9905]/40 rounded px-2 py-1 text-white text-sm w-full focus:outline-none"
                      />
                    ) : (
                      <span className="text-white font-medium">{c.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <input
                          value={editVals.city ?? ''}
                          onChange={e => setEditVals(v => ({ ...v, city: e.target.value }))}
                          placeholder="City"
                          className="bg-[#1E1E1E] border border-[#DF9905]/40 rounded px-2 py-1 text-white text-sm w-28 focus:outline-none"
                        />
                        <input
                          value={editVals.state ?? ''}
                          onChange={e => setEditVals(v => ({ ...v, state: e.target.value }))}
                          placeholder="ST"
                          className="bg-[#1E1E1E] border border-[#DF9905]/40 rounded px-2 py-1 text-white text-sm w-14 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editVals.par ?? ''}
                        onChange={e => setEditVals(v => ({ ...v, par: Number(e.target.value) }))}
                        className="bg-[#1E1E1E] border border-[#DF9905]/40 rounded px-2 py-1 text-white text-sm w-16 text-center focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-300">{c.par ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editVals.course_rating ?? ''}
                        onChange={e => setEditVals(v => ({ ...v, course_rating: Number(e.target.value) }))}
                        className="bg-[#1E1E1E] border border-[#DF9905]/40 rounded px-2 py-1 text-white text-sm w-16 text-center focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-300">{c.course_rating ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editVals.slope_rating ?? ''}
                        onChange={e => setEditVals(v => ({ ...v, slope_rating: Number(e.target.value) }))}
                        className="bg-[#1E1E1E] border border-[#DF9905]/40 rounded px-2 py-1 text-white text-sm w-16 text-center focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-300">{c.slope_rating ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(c.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-400/10 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white/[0.05] transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(c)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-[#DF9905] hover:bg-[#DF9905]/10 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="border-t border-white/[0.06] px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {page} of {pages} · {total.toLocaleString()} courses
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
