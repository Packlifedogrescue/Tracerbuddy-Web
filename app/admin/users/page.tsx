'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Trash2, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminUsers() {
  const [users,   setUsers]   = useState<any[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
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
    if (search) params.set('search', search)
    const res  = await fetch(`/api/admin/users?${params}`, { headers: { 'x-admin-email': email } })
    const data = await res.json()
    setUsers(data.users ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [email, page, search])

  useEffect(() => { load() }, [load])

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Remove personal data for "${name}"? This cannot be undone.`)) return
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'x-admin-email': email, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    load()
  }

  async function toggleSubscription(userId: string, current: string) {
    const next = current === 'pro' ? 'free' : 'pro'
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'x-admin-email': email, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: next }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription: next } : u))
  }

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} total accounts</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name or email..."
            className="bg-[#161616] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 w-64 focus:outline-none focus:border-[#DF9905]/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161616] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Plan</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Rounds</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Handicap</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Last Active</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-600">
                  <div className="w-5 h-5 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-600 text-sm">No users found</td>
              </tr>
            )}
            {!loading && users.map(u => (
              <tr key={u.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#DF9905]/20 flex items-center justify-center shrink-0 text-[11px] font-bold text-[#DF9905]">
                      {(u.display_name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-white font-medium truncate max-w-[140px]">{u.display_name || u.email?.split('@')[0] || 'Unknown'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 truncate max-w-[180px]">{u.email || '—'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleSubscription(u.id, u.subscription)}
                    title={u.subscription === 'pro' ? 'Click to downgrade to Free' : 'Click to upgrade to Pro'}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all hover:scale-105 ${
                      u.subscription === 'pro'
                        ? 'bg-[#DF9905]/15 text-[#DF9905] border border-[#DF9905]/30'
                        : 'bg-white/[0.05] text-gray-500 border border-white/[0.08] hover:border-[#DF9905]/30'
                    }`}
                  >
                    {u.subscription === 'pro' && <Star className="w-2.5 h-2.5 fill-current" />}
                    {u.subscription === 'pro' ? 'PRO' : 'FREE'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-white font-medium">{u.roundCount}</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-300">
                  {u.handicap != null ? u.handicap : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.lastActive ? format(new Date(u.lastActive), 'MMM d') : 'Never'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteUser(u.id, u.display_name || u.email)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="border-t border-white/[0.06] px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {page} of {pages} · {total} users
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
