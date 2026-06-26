'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { X, MapPin, Search, Flag, Loader2, AlertCircle, ChevronLeft } from 'lucide-react'

const CourseMapkit = dynamic(() => import('@/components/CourseMapkit'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────
interface GolfCourse {
  CourseID: string
  ClubName: string
  CourseName?: string
  City?: string
  StateCode?: string
  CountryCode?: string
  Latitude?: string | number
  Longitude?: string | number
}

interface GolfHole {
  HoleNo?: number
  Number?: number
  Par?: number
  Yardage?: number
  Yards?: number
  Handicap?: number
  TeeLatitude?: string | number
  TeeLongitude?: string | number
  GreenLatitude?: string | number
  GreenLongitude?: string | number
}

interface CourseDetail {
  CourseID?: string
  ClubName?: string
  CourseName?: string
  City?: string
  StateCode?: string
  Rating?: number | string
  Slope?: number | string
  Par?: number
  Holes?: GolfHole[]
  holes?: GolfHole[]
  Latitude?: string | number
  Longitude?: string | number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseNum(v: string | number | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(String(v))
  return isNaN(n) ? null : n
}
function holeNum(h: GolfHole) { return h.HoleNo ?? h.Number ?? 0 }
function holeYards(h: GolfHole) { return h.Yardage ?? h.Yards ?? null }

function parColor(par: number | undefined) {
  if (par === 3) return { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', label: 'Par 3' }
  if (par === 5) return { bg: 'rgba(34,160,107,0.15)', text: '#22A06B', label: 'Par 5' }
  return              { bg: 'rgba(107,114,128,0.12)', text: '#6B7280', label: `Par ${par ?? '—'}` }
}

// ── Hole panel (always-visible on desktop) ───────────────────────────────────
function HolePanel({
  detail, holes, activeHole, onSelect,
}: {
  detail: CourseDetail | null
  holes: GolfHole[]
  activeHole: number | null
  onSelect: (n: number) => void
}) {
  const sorted = [...holes].sort((a, b) => holeNum(a) - holeNum(b))
  const front  = sorted.filter(h => holeNum(h) <= 9)
  const back   = sorted.filter(h => holeNum(h) > 9)

  const totPar = (hs: GolfHole[]) => hs.reduce((s, h) => s + (h.Par ?? 0), 0)
  const totYds = (hs: GolfHole[]) => hs.reduce((s, h) => s + (holeYards(h) ?? 0), 0)

  function HoleRow({ h }: { h: GolfHole }) {
    const n = holeNum(h)
    const isActive = activeHole === n
    const pc = parColor(h.Par)
    const yds = holeYards(h)
    return (
      <div
        onClick={() => onSelect(n)}
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all border-b border-[#F5F0E8] last:border-0"
        style={{ background: isActive ? 'rgba(201,168,76,0.08)' : undefined }}
      >
        {/* Hole number */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-black shrink-0 transition-all"
          style={{
            background: isActive ? '#C9A84C' : '#F0EAE0',
            color: isActive ? '#fff' : '#111',
            boxShadow: isActive ? '0 2px 8px rgba(201,168,76,0.4)' : 'none',
          }}
        >
          {n}
        </div>

        {/* Yardage */}
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-bold leading-tight ${isActive ? 'text-[#C9A84C]' : 'text-[#111]'}`}>
            {yds ? `${yds} yds` : '—'}
          </div>
          {h.Handicap != null && (
            <div className="text-[10px] text-gray-400 mt-0.5">HCP {h.Handicap}</div>
          )}
        </div>

        {/* Par badge */}
        <div
          className="text-[10px] font-black px-2 py-1 rounded-lg shrink-0"
          style={{ background: pc.bg, color: pc.text }}
        >
          {pc.label}
        </div>
      </div>
    )
  }

  function TotalsRow({ label, hs }: { label: string; hs: GolfHole[] }) {
    const p = totPar(hs)
    const y = totYds(hs)
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F5F0E8]"
           style={{ background: '#F8F4EE' }}>
        <div className="w-8 text-[10px] font-black text-gray-400 uppercase tracking-wide">{label}</div>
        <div className="flex-1 text-[12px] font-bold text-gray-500">{y ? `${y.toLocaleString()} yds` : '—'}</div>
        <div className="text-[11px] font-black text-[#111]">{p ? `Par ${p}` : '—'}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Course stats */}
      {detail && (
        <div className="grid grid-cols-4 border-b border-[#F0EAE0] shrink-0">
          {[
            { label: 'Par',    value: detail.Par },
            { label: 'Rating', value: detail.Rating },
            { label: 'Slope',  value: detail.Slope },
            { label: 'Holes',  value: holes.length || 18 },
          ].map(s => (
            <div key={s.label} className="py-3 text-center border-r border-[#F0EAE0] last:border-0">
              <div className="text-[15px] font-black text-[#111] leading-none">{s.value ?? '—'}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Hole list */}
      <div className="flex-1 overflow-y-auto">
        {holes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-6">
            <p className="text-[12px] text-gray-400">Hole data not available for this course.</p>
          </div>
        ) : (
          <>
            {front.length > 0 && (
              <>
                <div className="px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10"
                     style={{ background: '#F8F4EE' }}>
                  Front 9
                </div>
                {front.map(h => <HoleRow key={holeNum(h)} h={h} />)}
                <TotalsRow label="Out" hs={front} />
              </>
            )}
            {back.length > 0 && (
              <>
                <div className="px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10"
                     style={{ background: '#F8F4EE' }}>
                  Back 9
                </div>
                {back.map(h => <HoleRow key={holeNum(h)} h={h} />)}
                <TotalsRow label="In" hs={back} />
              </>
            )}
            {holes.length > 0 && <TotalsRow label="Total" hs={sorted} />}
          </>
        )}
      </div>
    </div>
  )
}

// ── Search Result ─────────────────────────────────────────────────────────────
function SearchResult({ course, onSelect }: { course: GolfCourse; onSelect: () => void }) {
  const name = course.CourseName || course.ClubName
  const loc  = [course.City, course.StateCode].filter(Boolean).join(', ')
  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-4 py-3 hover:bg-[#FAF7F2] transition-colors border-b border-[#F8F4EE] last:border-0"
    >
      <div className="text-[13px] font-semibold text-[#111] leading-tight">{name}</div>
      {loc && <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{loc}</div>}
    </button>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function CourseMapPremium({ initialName, onClose }: {
  initialName?: string
  onClose: () => void
}) {
  const cleanName   = (initialName ?? '').split(' — ')[0].trim()
  const [query,     setQuery]     = useState(cleanName)
  const [results,   setResults]   = useState<GolfCourse[]>([])
  const [searching, setSearching] = useState(false)
  const [selected,  setSelected]  = useState<GolfCourse | null>(null)
  const [detail,    setDetail]    = useState<CourseDetail | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [activeHole, setActiveHole] = useState<number | null>(null)
  const [mobileTab, setMobileTab] = useState<'map' | 'scorecard'>('map')

  useEffect(() => { if (initialName) search(cleanName) }, [])

  async function search(q = query) {
    if (!q.trim()) return
    setSearching(true); setResults([]); setSelected(null); setDetail(null); setError('')
    try {
      const res  = await fetch(`/api/golf/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      const list: GolfCourse[] = data.courses ?? []
      setResults(list)
      if (list.length === 1) pickCourse(list[0])
    } catch { setError('Search failed — please try again.') }
    finally { setSearching(false) }
  }

  async function pickCourse(course: GolfCourse) {
    setSelected(course); setResults([]); setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/golf/course/${course.CourseID}`)
      const data: CourseDetail = await res.json()
      setDetail(data)
    } catch { setError('Could not load course details.') }
    finally { setLoading(false) }
  }

  function flyToHole(n: number) {
    setActiveHole(prev => prev === n ? null : n)
    setMobileTab('map')
  }

  const holes = detail?.Holes ?? detail?.holes ?? []
  const lat   = parseNum(detail?.Latitude  ?? selected?.Latitude)
  const lng   = parseNum(detail?.Longitude ?? selected?.Longitude)
  const hasMap = lat != null && lng != null
  const name  = detail?.CourseName ?? detail?.ClubName ?? selected?.CourseName ?? selected?.ClubName ?? ''
  const loc   = [detail?.City ?? selected?.City, detail?.StateCode ?? selected?.StateCode].filter(Boolean).join(', ')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 960, maxHeight: '94vh', height: selected ? '94vh' : 'auto' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F0EAE0] shrink-0 bg-white">
          {selected && (
            <button
              onClick={() => { setSelected(null); setDetail(null); setError(''); setActiveHole(null) }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#F0EAE0] transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#A07828] flex items-center justify-center shrink-0 shadow-sm">
            <Flag className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {selected ? (
              <>
                <div className="text-[15px] font-black text-[#111] leading-tight truncate">{name}</div>
                <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                  {loc && <><MapPin className="w-2.5 h-2.5" />{loc}</>}
                </div>
              </>
            ) : (
              <span className="text-[15px] font-black text-[#111]">Course Explorer</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-[#F0EAE0] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Search bar ── */}
        <div className="px-4 py-2.5 border-b border-[#F0EAE0] shrink-0 bg-white">
          <form onSubmit={e => { e.preventDefault(); search() }} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search any golf course…"
                className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl pl-9 pr-4 py-2 text-[13px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-[#C9A84C] hover:bg-[#A07828] text-white rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 shrink-0"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>
        </div>

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 text-[12.5px] text-red-500 bg-red-50 rounded-xl px-4 py-3 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* ── Search results ── */}
        {results.length > 0 && !selected && (
          <div className="overflow-auto">
            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-[#F8F4EE]">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
            {results.map(c => <SearchResult key={c.CourseID} course={c} onSelect={() => pickCourse(c)} />)}
          </div>
        )}

        {/* ── No results / empty ── */}
        {!searching && !selected && results.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-center py-12 px-6">
            <div>
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#F5EFE0] to-[#EDE5D0] flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Flag className="w-7 h-7 text-[#C9A84C]" />
              </div>
              <div className="text-[15px] font-black text-[#111] mb-1.5">
                {query ? 'No courses found' : 'Explore Any Course'}
              </div>
              <p className="text-[12.5px] text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                {query
                  ? 'Try a different spelling or city name.'
                  : 'Search for any golf course to see its satellite map, hole layout, and full scorecard.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F5EFE0] flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-6 h-6 text-[#C9A84C] animate-spin" />
              </div>
              <p className="text-[13px] text-gray-400">Loading course data…</p>
            </div>
          </div>
        )}

        {/* ── Course view ── */}
        {selected && !loading && (
          <div className="flex flex-col flex-1 min-h-0">

            {/* Mobile tab bar (hidden on lg+) */}
            <div className="flex border-b border-[#F0EAE0] shrink-0 lg:hidden">
              {(['map', 'scorecard'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setMobileTab(t)}
                  className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${
                    mobileTab === t ? 'text-[#C9A84C] border-b-2 border-[#C9A84C]' : 'text-gray-400'
                  }`}
                >
                  {t === 'map' ? 'Map' : 'Scorecard'}
                </button>
              ))}
            </div>

            {/* Desktop: side-by-side. Mobile: tab-controlled */}
            <div className="flex flex-1 min-h-0">

              {/* Map panel */}
              <div className={`flex-1 min-h-0 relative ${mobileTab !== 'map' ? 'hidden lg:flex' : 'flex'} flex-col`}>
                {hasMap ? (
                  <>
                    <CourseMapkit
                      lat={lat!}
                      lng={lng!}
                      holes={holes}
                      courseName={name}
                      selectedHole={activeHole ?? undefined}
                      onHoleClick={n => flyToHole(n)}
                    />

                    {/* Active hole info card */}
                    {activeHole != null && (() => {
                      const h = holes.find(h => holeNum(h) === activeHole)
                      if (!h) return null
                      const yds = holeYards(h)
                      const pc  = parColor(h.Par)
                      return (
                        <div
                          className="absolute top-3 left-3 z-10 rounded-2xl overflow-hidden pointer-events-none"
                          style={{ background: 'rgba(8,8,8,0.88)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                        >
                          <div className="px-4 py-3">
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Hole {activeHole}</div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-white font-black text-[22px] leading-none">{yds ?? '—'}</span>
                              <span className="text-gray-400 text-[12px] font-semibold">yards</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span
                                className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                                style={{ background: pc.bg, color: pc.text }}
                              >
                                {pc.label}
                              </span>
                              {h.Handicap != null && (
                                <span className="text-[10px] text-gray-500 font-semibold">HCP {h.Handicap}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Hole selector strip */}
                    {holes.length > 0 && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 px-4">
                        <div
                          className="flex gap-1 px-3 py-2 rounded-2xl"
                          style={{
                            background: 'rgba(8,8,8,0.85)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            maxWidth: '100%',
                            overflowX: 'auto',
                            scrollbarWidth: 'none',
                          }}
                        >
                          {[...holes]
                            .sort((a, b) => holeNum(a) - holeNum(b))
                            .map(h => {
                              const n = holeNum(h)
                              const isActive = activeHole === n
                              return (
                                <button
                                  key={n}
                                  onClick={() => flyToHole(n)}
                                  className="shrink-0 w-8 h-8 rounded-xl text-[12px] font-black transition-all flex flex-col items-center justify-center gap-0"
                                  style={{
                                    background: isActive ? '#C9A84C' : 'transparent',
                                    color: isActive ? '#111' : 'rgba(255,255,255,0.8)',
                                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                    boxShadow: isActive ? '0 2px 8px rgba(201,168,76,0.4)' : 'none',
                                  }}
                                >
                                  {n}
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#F8F4EE]">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-[#C9A84C] mx-auto mb-2" />
                      <p className="text-[13px] text-gray-400">No GPS coordinates available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Hole panel — always visible on desktop (lg+), tab-controlled on mobile */}
              <div
                className={`w-full lg:w-[300px] lg:border-l border-[#F0EAE0] lg:flex flex-col min-h-0 shrink-0 ${mobileTab === 'scorecard' ? 'flex' : 'hidden'}`}
              >
                <HolePanel
                  detail={detail}
                  holes={holes}
                  activeHole={activeHole}
                  onSelect={n => flyToHole(n)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
