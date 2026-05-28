'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Flag, Map, TrendingUp, Activity, UserPlus } from 'lucide-react'
import { format } from 'date-fns'

const ADMIN_EMAIL = 'miller.brett88@gmail.com'

async function adminFetch(path: string, email: string) {
  const res = await fetch(path, { headers: { 'x-admin-email': email } })
  return res.json()
}

function StatCard({ icon: Icon, label, value, sub, color = '#DF9905' }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-[11px] font-semibold tracking-[0.12em] text-gray-500 uppercase">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

function Sparkbar({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map(({ date, count }) => (
        <div key={date} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm bg-[#DF9905] transition-all"
            style={{ height: `${Math.max((count / max) * 100, 4)}%`, opacity: count === 0 ? 0.2 : 0.85 }}
          />
        </div>
      ))}
    </div>
  )
}

export default function AdminOverview() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return
      adminFetch('/api/admin/stats', user.email).then(d => {
        setData(d)
        setLoading(false)
      })
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users}     label="Total Users"     value={data.totalUsers}   sub={`+${data.newUsersWeek} this week`} />
        <StatCard icon={Flag}      label="Total Rounds"    value={data.totalRounds}  sub={`${data.roundsToday} today`} color="#4ADE80" />
        <StatCard icon={Map}       label="Courses"         value={data.totalCourses} color="#60A5FA" />
        <StatCard icon={Activity}  label="Rounds This Week" value={data.roundsWeek}  color="#A78BFA" />
        <StatCard icon={UserPlus}  label="New Users (7d)"  value={data.newUsersWeek} color="#F472B6" />
        <StatCard icon={TrendingUp} label="Rounds Today"   value={data.roundsToday}  color="#34D399" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Daily rounds chart */}
        <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Rounds — Last 7 Days</h2>
          <p className="text-xs text-gray-500 mb-5">Daily round completions</p>
          {data.dailyRounds?.length > 0 && <Sparkbar data={data.dailyRounds} />}
          <div className="flex justify-between mt-2">
            {(data.dailyRounds ?? []).map((d: any) => (
              <span key={d.date} className="text-[10px] text-gray-600 flex-1 text-center">
                {format(new Date(d.date + 'T12:00:00'), 'EEE')}
              </span>
            ))}
          </div>
        </div>

        {/* Top courses */}
        <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Top Courses (30 days)</h2>
          <p className="text-xs text-gray-500 mb-5">Most played courses</p>
          <div className="space-y-3">
            {(data.topCourses ?? []).length === 0 && (
              <p className="text-gray-600 text-sm">No round data yet</p>
            )}
            {(data.topCourses ?? []).map((c: any, i: number) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-gray-600 w-4 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white truncate">{c.name}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">{c.count} rounds</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#DF9905] rounded-full"
                      style={{ width: `${(c.count / data.topCourses[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-1">Recent Signups</h2>
          <p className="text-xs text-gray-500 mb-5">Latest 5 user registrations</p>
          <div className="space-y-2">
            {(data.recentSignups ?? []).length === 0 && (
              <p className="text-gray-600 text-sm">No users yet</p>
            )}
            {(data.recentSignups ?? []).map((u: any) => (
              <div key={u.id} className="flex items-center gap-4 py-2.5 border-b border-white/[0.04] last:border-0">
                <div className="w-8 h-8 rounded-full bg-[#DF9905]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#DF9905]">
                    {(u.display_name || u.email || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{u.display_name || u.email?.split('@')[0] || 'Unknown'}</div>
                  <div className="text-xs text-gray-500 truncate">{u.email || '—'}</div>
                </div>
                <div className="text-xs text-gray-500 shrink-0">
                  {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
