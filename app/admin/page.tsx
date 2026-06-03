'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Users, Flag, Map, TrendingUp, Activity, UserPlus,
  Target, Dumbbell, Trophy, MessageSquare, GitCommit, Disc,
  Star, Zap, BarChart2, Wind, Brain, RefreshCw, DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'

async function adminFetch(path: string, email: string) {
  const res = await fetch(path, { headers: { 'x-admin-email': email } })
  return res.json()
}

function StatCard({ icon: Icon, label, value, sub, color = '#DF9905', prefix = '', suffix = '' }: {
  icon: any; label: string; value: string | number | null; sub?: string
  color?: string; prefix?: string; suffix?: string
}) {
  return (
    <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-[11px] font-semibold tracking-[0.12em] text-gray-500 uppercase">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">
        {value != null ? `${prefix}${typeof value === 'number' ? value.toLocaleString() : value}${suffix}` : '—'}
      </div>
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

function MiniSparkbar({ data, color = '#DF9905' }: { data: { date: string; count: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-px h-8">
      {data.map(({ date, count }) => (
        <div key={date} className="flex-1">
          <div
            className="w-full rounded-sm transition-all"
            style={{
              height: `${Math.max((count / max) * 100, 4)}%`,
              backgroundColor: color,
              opacity: count === 0 ? 0.15 : 0.8,
            }}
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

  if (!data || data.error) return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
      Failed to load stats. Check that your admin email matches.
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

      {/* Subscriptions & Revenue */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] text-gray-600 uppercase mb-3">Subscriptions & Revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Star}        label="Pro Subscribers"  value={data.proUsers}        color="#DF9905"  sub="active Pro plan" />
          <StatCard icon={Users}       label="Free Users"       value={data.freeUsers}       color="#6B7280"  sub={`${data.conversionRate}% converted to Pro`} />
          <StatCard icon={TrendingUp}  label="Conversion Rate"  value={data.conversionRate}  color="#4ADE80"  suffix="%" sub="free → pro" />
          <StatCard icon={DollarSign}  label="MRR Estimate"     value={data.mrrEstimate}     color="#34D399"  prefix="$" sub="at $9.99/mo per Pro" />
        </div>
      </div>

      {/* Users & Rounds */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] text-gray-600 uppercase mb-3">Users & Rounds</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}    label="Total Users"      value={data.totalUsers}   sub={`+${data.newUsersWeek} this week`} />
          <StatCard icon={UserPlus} label="New (7 days)"     value={data.newUsersWeek} color="#F472B6" />
          <StatCard icon={Flag}     label="Total Rounds"     value={data.totalRounds}  sub={`${data.roundsToday} today`} color="#4ADE80" />
          <StatCard icon={Activity} label="Rounds This Week" value={data.roundsWeek}   color="#A78BFA" />
        </div>
      </div>

      {/* Engagement */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] text-gray-600 uppercase mb-3">Engagement</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Zap}        label="Active (7 Days)"  value={data.activeUsersWeek} color="#FBBF24" sub="unique users with activity" />
          <StatCard icon={BarChart2}  label="Rounds / User"    value={data.roundsPerUser}   color="#60A5FA" sub="avg across all users" />
          <StatCard icon={RefreshCw}  label="D28 Retention"    value={data.retentionRate != null ? `${data.retentionRate}%` : '—'} color="#A78BFA" sub="wk-4 cohort still active" />
          <StatCard icon={TrendingUp} label="Avg Score"        value={data.avgScore}         color="#34D399" sub="across all rounds" />
        </div>
      </div>

      {/* Feature Usage (30 days) */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] text-gray-600 uppercase mb-3">Feature Usage — Last 30 Days</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Brain}      label="AI Coach Queries" value={data.aiCoachUses}   color="#F472B6" sub="30-day total" />
          <StatCard icon={Map}        label="Map Views"        value={data.mapViews}       color="#60A5FA" sub="course map opens" />
          <StatCard icon={Wind}       label="Weather Views"    value={data.weatherViews}   color="#06B6D4" sub="weather page opens" />
          <StatCard icon={GitCommit}  label="Holes Tracked"    value={data.totalHoleStats} color="#F59E0B" sub="all-time" />
        </div>
      </div>

      {/* Performance Data */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] text-gray-600 uppercase mb-3">Performance Data</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Map}        label="Courses Played"    value={data.totalCourses}  color="#60A5FA" />
          <StatCard icon={Target}     label="Swing Videos"      value={data.totalSwings}   color="#EC4899" />
          <StatCard icon={Disc}       label="Putts Logged"      value={data.totalPutts}    color="#06B6D4" />
          <StatCard icon={Dumbbell}   label="Practice Sessions" value={data.totalPractice} color="#8B5CF6" />
        </div>
      </div>

      {/* App Activity */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] text-gray-600 uppercase mb-3">App Activity</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Trophy}        label="Tournaments"     value={data.totalTournaments} color="#F97316" />
          <StatCard icon={MessageSquare} label="Community Posts" value={data.totalPosts}       color="#84CC16" />
          <StatCard icon={Flag}          label="Rounds Today"    value={data.roundsToday}      color="#4ADE80" />
          <StatCard icon={Activity}      label="Rounds / Week"   value={data.roundsWeek}       color="#A78BFA" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Daily Rounds */}
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

        {/* Daily Active Users (30 days) */}
        <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Daily Active Users — Last 30 Days</h2>
          <p className="text-xs text-gray-500 mb-5">Unique users with any app event per day</p>
          {(data.dauData ?? []).length > 0 && <MiniSparkbar data={data.dauData} color="#A78BFA" />}
          <div className="flex justify-between mt-2">
            {[29, 22, 15, 8, 1].map(i => {
              const d = new Date(Date.now() - i * 86400000)
              return (
                <span key={i} className="text-[10px] text-gray-600">
                  {format(d, 'MMM d')}
                </span>
              )
            })}
          </div>
        </div>

        {/* Top Courses */}
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

        {/* Feature Usage Breakdown */}
        <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Feature Usage Breakdown</h2>
          <p className="text-xs text-gray-500 mb-5">Which features get used most (30 days)</p>
          <div className="space-y-3">
            {[
              { label: 'AI Coach', value: data.aiCoachUses ?? 0, color: '#F472B6' },
              { label: 'Course Map', value: data.mapViews ?? 0, color: '#60A5FA' },
              { label: 'Weather', value: data.weatherViews ?? 0, color: '#06B6D4' },
              { label: 'Hole Stats', value: data.totalHoleStats ?? 0, color: '#F59E0B' },
              { label: 'Putts', value: data.totalPutts ?? 0, color: '#A78BFA' },
            ].sort((a, b) => b.value - a.value).map(({ label, value, color }) => {
              const maxVal = Math.max(data.aiCoachUses ?? 0, data.mapViews ?? 0, data.weatherViews ?? 0, data.totalHoleStats ?? 0, data.totalPutts ?? 0, 1)
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(value / maxVal) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs font-medium text-white w-6 text-right shrink-0">{value}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Subscription Breakdown</h2>
          <p className="text-xs text-gray-500 mb-5">Free vs Pro split</p>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-[#DF9905] font-semibold">Pro</span>
                <span className="text-xs text-white">{data.proUsers ?? 0}</span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#DF9905] rounded-full"
                  style={{ width: `${data.conversionRate ?? 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-gray-500 font-semibold">Free</span>
                <span className="text-xs text-white">{data.freeUsers ?? 0}</span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-600 rounded-full"
                  style={{ width: `${100 - (data.conversionRate ?? 0)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">MRR (est.)</div>
              <div className="text-xl font-bold text-[#4ADE80]">${data.mrrEstimate}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Conversion</div>
              <div className="text-xl font-bold text-white">{data.conversionRate}%</div>
            </div>
          </div>
        </div>

        {/* Recent Signups */}
        <div className="bg-[#161616] border border-white/[0.06] rounded-xl p-6">
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
