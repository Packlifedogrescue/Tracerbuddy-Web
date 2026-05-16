'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Calendar, ChevronRight, MapPin, Trophy, Flag,
  ArrowDown, ArrowUp, TrendingUp, TrendingDown, Watch,
  BarChart2, Clock, ClipboardList, Target, Smartphone,
  X, Map,
} from 'lucide-react'
import CourseMapPremium from '@/components/CourseMapPremium'
import WeatherWidget    from '@/components/WeatherWidget'
import {
  supabase,
  fetchRounds,
  fetchHandicapHistory,
  fetchClubProfiles,
  fetchUserProfile,
} from '@/lib/supabase'

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#C9A84C', w = 80, h = 24 }: {
  data: number[]; color?: string; w?: number; h?: number
}) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = (max - min) || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
const PALETTE = ['#2D6A4F','#6B9E5E','#4A7C59','#C9A84C','#8B7355','#5B8A65','#A07340','#607D4A','#3D7A6E','#7A6030']
function courseColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType
  title: string
  sub: string
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-14 h-14 rounded-2xl bg-[#F5EFE0] flex items-center justify-center mx-auto mb-3.5">
        <Icon className="w-6 h-6 text-[#C9A84C]" />
      </div>
      <div className="text-[14px] font-semibold text-[#333] mb-1">{title}</div>
      <p className="text-[12.5px] text-gray-400 max-w-[260px] mx-auto leading-relaxed">{sub}</p>
    </div>
  )
}

// ─── Card wrapper (with hover lift) ──────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.055)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)] ${className}`}>
      {children}
    </div>
  )
}

// ─── Get Started banner ───────────────────────────────────────────────────────
function GetStarted({ onClose }: { onClose: () => void }) {
  return (
    <div className="bg-gradient-to-br from-[#FFFBF2] to-white rounded-xl border border-[#EDD98A]/40 shadow-[0_2px_16px_rgba(201,168,76,0.08)] p-5 relative">
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-[#F0EAE0] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#FEF3E8] flex items-center justify-center shrink-0 mt-0.5">
          <Target className="w-5 h-5 text-[#C9A84C]" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-[15px] font-black text-[#111] leading-tight mb-1">
            Get started with TracerBuddy
          </h3>
          <p className="text-[12.5px] text-gray-400 mb-4 leading-relaxed">
            Your stats, courses, and round history will appear here automatically once you start tracking.
          </p>
          <div className="space-y-2.5">
            {[
              { step: '1', text: 'Download the TracerBuddy app on your iPhone', icon: Smartphone },
              { step: '2', text: 'Play a round and track each shot in real time', icon: Flag },
              { step: '3', text: 'Your data syncs automatically to this dashboard', icon: BarChart2 },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-white">{s.step}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-[12.5px] text-gray-600">{s.text}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Course Explorer card ─────────────────────────────────────────────────────
function CourseExplorerCard({ onOpen }: { onOpen: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Map className="w-3.5 h-3.5 text-[#C9A84C]" />
        <span className="text-[13px] font-bold text-[#111]">Explore a Course</span>
      </div>
      <p className="text-[11.5px] text-gray-400 mb-3 leading-relaxed">
        Search any course for a satellite map, hole layout, and scorecard before you play.
      </p>
      <button
        onClick={onOpen}
        className="w-full bg-[#C9A84C] hover:bg-[#A07828] text-white text-[12.5px] font-semibold py-2.5 rounded-xl transition-colors"
      >
        Search Courses
      </button>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [loading,          setLoading]         = useState(true)
  const [userName,         setUserName]        = useState('')
  const [profile,          setProfile]         = useState<any>(null)
  const [rounds,           setRounds]          = useState<any[]>([])
  const [handicapHistory,  setHandicapHistory] = useState<number[]>([])
  const [clubs,            setClubs]           = useState<any[]>([])
  const [bannerDismissed,  setBannerDismissed] = useState(false)
  const [mapOpen,          setMapOpen]         = useState(false)
  const [mapInitialName,   setMapInitialName]  = useState<string | undefined>()
  const [weatherPos,       setWeatherPos]      = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBannerDismissed(localStorage.getItem('tb_banner_dismissed') === '1')
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth/login'); return }
      load()
    })
    // Get location for weather widget
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setWeatherPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()  => {}, // user denied — widget stays hidden
      )
    }
  }, [])

  async function load() {
    const [p, r, h, c, { data: { user } }] = await Promise.all([
      fetchUserProfile(),
      fetchRounds(50),
      fetchHandicapHistory(),
      fetchClubProfiles(),
      supabase.auth.getUser(),
    ])
    setProfile(p)
    setRounds(r)
    setHandicapHistory((h as any[]).map((x: any) => parseFloat(x.handicap?.toFixed(1))))
    setClubs(c)
    const m = user?.user_metadata ?? {}
    const candidates = [(p as any)?.display_name, m.display_name, m.full_name, m.name]
    const resolved = candidates.find(c => c && c.trim() && !c.includes('@')) || 'Golfer'
    setUserName(resolved.trim())
    setLoading(false)
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalRounds = rounds.length
  const scored      = rounds.filter(r => r.total_score)
  const avgScore    = scored.length ? Math.round(scored.reduce((a, r) => a + r.total_score, 0) / scored.length) : null
  const bestRound   = scored.length ? Math.min(...scored.map(r => r.total_score)) : null
  const puttRds     = rounds.filter(r => r.putts)
  const avgPutts    = puttRds.length ? (puttRds.reduce((a, r) => a + r.putts, 0) / puttRds.length).toFixed(1) : null
  const girRds      = rounds.filter(r => r.gir_count != null)
  const avgGIR      = girRds.length ? Math.round(girRds.reduce((a, r) => a + r.gir_count, 0) / girRds.length / 18 * 100) : null
  // Only show handicap when the user has actual rounds (avoids showing 0.0 default)
  const latestHcp   = totalRounds > 0 ? ((profile as any)?.handicap_index ?? null) : null
  const latestRound = rounds[0] ?? null
  const firstName   = userName.split(' ')[0] || 'Golfer'

  function dismissBanner() {
    setBannerDismissed(true)
    localStorage.setItem('tb_banner_dismissed', '1')
  }

  // Courses visited
  const courseMap: Record<string, { name: string; count: number; scores: number[]; lastPlayed: string }> = {}
  for (const r of rounds) {
    if (!r.course_name) continue
    if (!courseMap[r.course_name]) {
      courseMap[r.course_name] = { name: r.course_name, count: 0, scores: [], lastPlayed: r.created_at }
    }
    courseMap[r.course_name].count++
    if (r.total_score) courseMap[r.course_name].scores.push(r.total_score)
    if (r.created_at > courseMap[r.course_name].lastPlayed) {
      courseMap[r.course_name].lastPlayed = r.created_at
    }
  }
  const coursesVisited = Object.values(courseMap).sort((a, b) => b.count - a.count)
  const scoreSparkData = scored.slice(0, 8).map(r => r.total_score).reverse()

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#F0EAE0] border-t-[#C9A84C] animate-spin mx-auto mb-4" />
        <p className="text-[13.5px] text-gray-400 font-medium">Loading your stats…</p>
      </div>
    </div>
  )

  const statCards = [
    {
      label: 'Handicap',
      value: latestHcp != null ? latestHcp.toFixed(1) : '—',
      footer: totalRounds > 0 ? 'Current index' : 'No rounds yet',
      spark: handicapHistory.slice(-8),
    },
    {
      label: 'Rounds Tracked',
      value: totalRounds > 0 ? String(totalRounds) : '—',
      footer: 'All time',
      spark: [],
    },
    {
      label: 'Avg Score',
      value: avgScore != null ? String(avgScore) : '—',
      footer: scored.length > 0 ? `Last ${Math.min(scored.length, 20)} rounds` : 'No data yet',
      spark: scoreSparkData,
    },
    {
      label: 'Best Round',
      value: bestRound != null ? String(bestRound) : '—',
      footer: 'All time low',
      spark: [],
      gold: true,
    },
    {
      label: 'Avg Putts',
      value: avgPutts ?? '—',
      footer: puttRds.length ? `${puttRds.length} rounds` : 'No data yet',
      spark: [],
    },
  ]

  return (
    <div className="p-5 md:p-6 space-y-4 min-h-full pb-10">

      {/* ── Welcome ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black text-[#111] tracking-tight leading-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-[13.5px] text-gray-400 mt-0.5">
            {totalRounds > 0
              ? `${totalRounds} round${totalRounds !== 1 ? 's' : ''} tracked · ${coursesVisited.length} course${coursesVisited.length !== 1 ? 's' : ''} visited`
              : 'Every round becomes usable data.'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-1 text-[12.5px] text-gray-400 font-medium bg-white rounded-lg px-3 py-2 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
          <Calendar className="w-3.5 h-3.5 text-[#C9A84C]" />
          {format(new Date(), 'MMMM d, yyyy')}
        </div>
      </div>

      {/* ── Get Started banner (only when no data and not dismissed) ── */}
      {totalRounds === 0 && !bannerDismissed && <GetStarted onClose={dismissBanner} />}

      {/* ── Course map modal ── */}
      {mapOpen && (
        <CourseMapPremium
          initialName={mapInitialName}
          onClose={() => { setMapOpen(false); setMapInitialName(undefined) }}
        />
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map(c => (
          <Card key={c.label} className="p-4 hover:-translate-y-0.5 cursor-default">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {c.label}
            </div>
            <div className={`text-[30px] font-black leading-none mb-1 ${c.gold ? 'text-[#C9A84C]' : 'text-[#111]'}`}>
              {c.value}
            </div>
            {c.spark.length > 1 && (
              <div className="my-1.5">
                <Sparkline data={c.spark} color="#C9A84C" />
              </div>
            )}
            <div className="text-[11px] text-gray-400 mt-1">{c.footer}</div>
          </Card>
        ))}
      </div>

      {/* ── Main two-column grid ── */}
      <div className="flex gap-4 items-start">

        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Latest Round */}
          <Card>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EAE0]">
              <div className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span className="text-[13.5px] font-bold text-[#111]">Latest Round</span>
              </div>
              {latestRound && (
                <Link href="/dashboard/rounds" className="text-[12px] font-semibold text-[#C9A84C] hover:text-[#A07828] flex items-center gap-1 transition-colors">
                  All Rounds <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {latestRound ? (
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl shrink-0 mt-0.5"
                      style={{ background: courseColor(latestRound.course_name || 'Unknown') }}
                    />
                    <div>
                      <div className="text-[16px] font-black text-[#111] leading-tight">
                        {latestRound.course_name || 'Unknown Course'}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-gray-400 mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(latestRound.created_at), 'MMMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  {latestRound.total_score && (
                    <div className="text-right shrink-0">
                      <div className="text-[40px] font-black text-[#C9A84C] leading-none">
                        {latestRound.total_score}
                      </div>
                      {latestRound.course_par && (
                        <div className={`text-[13px] font-bold ${
                          latestRound.total_score - latestRound.course_par < 0 ? 'text-[#22A06B]'
                          : latestRound.total_score - latestRound.course_par > 0 ? 'text-red-400'
                          : 'text-gray-500'
                        }`}>
                          {latestRound.total_score - latestRound.course_par < 0
                            ? `−${Math.abs(latestRound.total_score - latestRound.course_par)}`
                            : latestRound.total_score - latestRound.course_par === 0 ? 'E'
                            : `+${latestRound.total_score - latestRound.course_par}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { label: 'GIR',   value: latestRound.gir_count != null ? `${latestRound.gir_count}/18` : '—' },
                    { label: 'Putts', value: latestRound.putts ?? '—' },
                    { label: 'FIR',   value: latestRound.fairways_hit != null ? `${latestRound.fairways_hit}/14` : '—' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#F8F4EE] rounded-xl p-3 text-center">
                      <div className="text-[18px] font-black text-[#111]">{s.value}</div>
                      <div className="text-[10.5px] text-gray-400 font-medium mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/dashboard/rounds/${latestRound.id}`}
                  className="mt-4 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111] hover:text-[#C9A84C] transition-colors"
                >
                  View full round details <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <Empty icon={Flag} title="No rounds tracked yet" sub="Complete a round in the TracerBuddy app and it will appear here." />
            )}
          </Card>

          {/* Courses Visited */}
          <Card>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EAE0]">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span className="text-[13.5px] font-bold text-[#111]">Courses Visited</span>
                {coursesVisited.length > 0 && (
                  <span className="text-[11px] font-bold bg-[#F5EFE0] text-[#C9A84C] px-2 py-0.5 rounded-full">
                    {coursesVisited.length}
                  </span>
                )}
              </div>
            </div>

            {coursesVisited.length > 0 ? (
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {coursesVisited.map(course => {
                  const best = course.scores.length ? Math.min(...course.scores) : null
                  const avg  = course.scores.length
                    ? Math.round(course.scores.reduce((a: number, b: number) => a + b, 0) / course.scores.length)
                    : null
                  return (
                    <div
                      key={course.name}
                      onClick={() => { setMapInitialName(course.name); setMapOpen(true) }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && (setMapInitialName(course.name), setMapOpen(true))}
                      className="bg-[#F8F4EE] rounded-xl p-4 hover:bg-[#F0E8D8] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-none hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]"
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: courseColor(course.name) }} />
                        <div className="flex items-center gap-1.5">
                          <Map className="w-3 h-3 text-gray-300" />
                          <span className="text-[10.5px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full">
                            {course.count}×
                          </span>
                        </div>
                      </div>
                      <div className="text-[13px] font-bold text-[#111] leading-tight mb-2.5">{course.name}</div>
                      {(best || avg) && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {best && (
                            <div>
                              <div className="text-[16px] font-black text-[#C9A84C]">{best}</div>
                              <div className="text-[9.5px] text-gray-400 font-medium">Best</div>
                            </div>
                          )}
                          {avg && (
                            <div>
                              <div className="text-[16px] font-black text-[#111]">{avg}</div>
                              <div className="text-[9.5px] text-gray-400 font-medium">Avg</div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(course.lastPlayed), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty icon={MapPin} title="No courses tracked yet" sub="Your course history appears here after you track rounds." />
            )}
          </Card>

          {/* Recent Rounds */}
          <Card>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EAE0]">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span className="text-[13.5px] font-bold text-[#111]">Recent Rounds</span>
              </div>
              {rounds.length > 0 && (
                <Link href="/dashboard/rounds" className="text-[12px] font-semibold text-[#C9A84C] hover:text-[#A07828] transition-colors">
                  View All
                </Link>
              )}
            </div>

            {rounds.length > 0 ? (
              <div>
                <div className="grid grid-cols-12 px-5 py-2 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider border-b border-[#F8F4EE]">
                  <div className="col-span-5">Course</div>
                  <div className="col-span-3">Date</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-right">SG</div>
                </div>
                {rounds.slice(0, 8).map((r: any) => {
                  const diff  = r.course_par && r.total_score ? r.total_score - r.course_par : null
                  const sgPos = r.strokes_gained != null ? r.strokes_gained >= 0 : null
                  return (
                    <Link
                      key={r.id}
                      href={`/dashboard/rounds/${r.id}`}
                      className="grid grid-cols-12 px-5 py-3 items-center hover:bg-[#FAF7F2] transition-colors border-b border-[#F8F4EE] last:border-0"
                    >
                      <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg shrink-0" style={{ background: courseColor(r.course_name || '') }} />
                        <span className="text-[12px] font-medium text-[#111] truncate">{r.course_name || 'Unknown'}</span>
                      </div>
                      <div className="col-span-3 text-[11.5px] text-gray-400">
                        {format(new Date(r.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="col-span-2 text-center">
                        {r.total_score && (
                          <div>
                            <div className="text-[13px] font-bold text-[#111]">{r.total_score}</div>
                            {diff !== null && (
                              <div className={`text-[10.5px] font-semibold ${diff < 0 ? 'text-[#22A06B]' : diff > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        {r.strokes_gained != null && (
                          <div className={`flex items-center justify-end gap-1 text-[12px] font-semibold ${sgPos ? 'text-[#22A06B]' : 'text-red-400'}`}>
                            {sgPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {r.strokes_gained > 0 ? `+${r.strokes_gained.toFixed(2)}` : r.strokes_gained.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <Empty icon={ClipboardList} title="No rounds yet" sub="Track your first round in the TracerBuddy app to see your history here." />
            )}
          </Card>
        </div>

        {/* ── Right panel ── */}
        <div className="w-[268px] shrink-0 space-y-3">

          {/* Handicap trend */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span className="text-[13px] font-bold text-[#111]">Handicap Trend</span>
            </div>
            {handicapHistory.length >= 2 ? (
              <>
                <div className="flex items-end gap-2 mb-1">
                  <div className="text-[32px] font-black text-[#111] leading-none">
                    {handicapHistory[handicapHistory.length - 1]?.toFixed(1)}
                  </div>
                  {(() => {
                    const delta    = handicapHistory[handicapHistory.length - 1] - handicapHistory[0]
                    const improved = delta < 0
                    return (
                      <div className={`flex items-center gap-0.5 text-[12px] font-semibold mb-1 ${improved ? 'text-[#22A06B]' : 'text-red-400'}`}>
                        {improved ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                        {Math.abs(delta).toFixed(1)}
                      </div>
                    )
                  })()}
                </div>
                <Sparkline data={handicapHistory} color="#C9A84C" w={236} h={40} />
                <div className="text-[11px] text-gray-400 mt-1">
                  {handicapHistory.length} data points recorded
                </div>
              </>
            ) : (
              <Empty icon={TrendingUp} title="Not enough data" sub="Track more rounds to see your handicap trend." />
            )}
          </Card>

          {/* Quick stats */}
          {totalRounds > 0 && (
            <Card className="p-4">
              <div className="text-[13px] font-bold text-[#111] mb-3">Quick Stats</div>
              <div className="space-y-3">
                {[
                  { label: 'Avg GIR',          value: avgGIR != null ? `${avgGIR}%` : '—', icon: Flag },
                  { label: 'Avg Putts',         value: avgPutts ?? '—',                     icon: Trophy },
                  { label: 'Courses Visited',   value: String(coursesVisited.length),        icon: MapPin },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#F5EFE0] flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-[#C9A84C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-gray-400">{s.label}</div>
                        <div className="text-[14px] font-bold text-[#111]">{s.value}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Club Performance */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-bold text-[#111]">Club Performance</span>
              <Link href="/dashboard/clubs" className="text-[12px] font-semibold text-[#C9A84C] hover:text-[#A07828] transition-colors">
                Manage
              </Link>
            </div>
            <div className="text-[11px] text-gray-400 mb-3">Carry distance (yds)</div>
            {clubs.length > 0 ? (
              <div className="space-y-2">
                {clubs.slice(0, 8).map((c: any) => {
                  const maxDist = Math.max(...clubs.map((x: any) => x.avg_yards || 0)) || 1
                  return (
                    <div key={c.id || c.club_name} className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-500 w-8 shrink-0">
                        {c.short_name || c.club_name?.slice(0, 3) || '—'}
                      </span>
                      <div className="flex-1 h-2 bg-[#F0EAE0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C9A84C] rounded-full transition-all"
                          style={{ width: `${((c.avg_yards || 0) / maxDist) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#111] w-8 text-right shrink-0">
                        {c.avg_yards ? Math.round(c.avg_yards) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty icon={BarChart2} title="No club data yet" sub="Club distances sync from the app after your rounds." />
            )}
          </Card>

          {/* Weather */}
          {weatherPos && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[13px]">⛳</span>
                <span className="text-[13px] font-bold text-[#111]">Playing Conditions</span>
              </div>
              <WeatherWidget lat={weatherPos.lat} lng={weatherPos.lng} />
            </Card>
          )}

          {/* Course Explorer */}
          <CourseExplorerCard onOpen={() => { setMapInitialName(undefined); setMapOpen(true) }} />

          {/* Apple Watch */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Watch className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span className="text-[13px] font-bold text-[#111]">Apple Watch</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3E8] text-[#C9A84C]">Coming Soon</span>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: '⌚', label: 'Live shot tracking', desc: 'Auto-detect and log shots from your wrist' },
                { icon: '📍', label: 'GPS yardages',       desc: 'See front, middle, back on every hole' },
                { icon: '🏌️', label: 'Score entry',        desc: 'Quick score input between shots' },
              ].map(f => (
                <div key={f.label} className="flex items-start gap-3 p-2.5 bg-[#F8F4EE] rounded-xl">
                  <span className="text-[16px] mt-0.5 shrink-0">{f.icon}</span>
                  <div>
                    <div className="text-[12px] font-semibold text-[#111]">{f.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
