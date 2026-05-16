'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import {
  Search, MapPin, Flag, Loader2, AlertCircle,
  ChevronRight, Clock, Trophy, X, CloudSun,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import WeatherWidget from '@/components/WeatherWidget'

const CourseMapbox = dynamic(() => import('@/components/CourseMapbox'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────
interface GolfCourse {
  CourseID: string
  ClubName: string
  CourseName?: string
  City?: string
  StateCode?: string
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

interface GolfTee {
  teeID: string
  teeName: string
  teeColor: string
  courseRatingMen?: number | string
  slopeMen?: number | string
  courseRatingWomen?: number | string
  slopeWomen?: number | string
  [key: string]: any // length1–length18
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
  Tees?: GolfTee[]
  Latitude?: string | number
  Longitude?: string | number
  website?: string
  telephone?: string
}

interface VisitedCourse {
  name: string
  count: number
  scores: number[]
  lastPlayed: string
}

function parseNum(v: string | number | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(String(v))
  return isNaN(n) ? null : n
}

function holeNum(h: GolfHole)   { return h.HoleNo ?? h.Number ?? 0 }
function holeYards(h: GolfHole) { return h.Yardage ?? h.Yards ?? null }

const PALETTE = ['#2D6A4F','#6B9E5E','#4A7C59','#C9A84C','#8B7355','#5B8A65','#A07340','#607D4A','#3D7A6E','#7A6030']
function courseColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// ── Scorecard ─────────────────────────────────────────────────────────────────
function Scorecard({ holes, tees = [] }: { holes: GolfHole[]; tees?: GolfTee[] }) {
  const [teeIdx, setTeeIdx] = useState(0)
  const activeTee = tees[teeIdx]

  function getYards(holeNo: number, fallback: GolfHole): number | null {
    if (activeTee) {
      const v = activeTee[`length${holeNo}`]
      if (v != null && Number(v) > 0) return Number(v)
    }
    return holeYards(fallback)
  }

  const sorted     = [...holes].sort((a, b) => holeNum(a) - holeNum(b))
  const front      = sorted.filter(h => holeNum(h) <= 9)
  const back       = sorted.filter(h => holeNum(h) > 9)
  const frontYards = front.reduce((s, h) => s + (getYards(holeNum(h), h) ?? 0), 0)
  const backYards  = back.reduce((s,  h) => s + (getYards(holeNum(h), h) ?? 0), 0)
  const totalPar   = holes.reduce((s, h) => s + (h.Par ?? 0), 0)

  const rating = activeTee?.courseRatingMen
  const slope  = activeTee?.slopeMen

  function HoleRow({ h }: { h: GolfHole }) {
    const n   = holeNum(h)
    const yds = getYards(n, h)
    const par = h.Par ?? 0
    return (
      <tr className="hover:bg-[#F8F4EE] transition-colors border-b border-[#F8F4EE] last:border-0">
        <td className="py-1.5 pl-3">
          <span className="text-[12px] font-bold text-[#111]">{n}</span>
        </td>
        <td className="py-1.5 text-center">
          <span className={`text-[12px] font-bold ${par === 3 ? 'text-blue-500' : par === 5 ? 'text-[#22A06B]' : 'text-[#111]'}`}>
            {h.Par ?? '—'}
          </span>
        </td>
        <td className="py-1.5 text-center text-[12px] text-gray-600 font-medium">{yds ?? '—'}</td>
        <td className="py-1.5 pr-3 text-center text-[11px] text-gray-400">{h.Handicap ?? '—'}</td>
      </tr>
    )
  }

  function TotalsRow({ label, par, yards }: { label: string; par: number; yards: number }) {
    return (
      <tr className="bg-[#F8F4EE] border-t border-[#E8E0D0]">
        <td className="py-2 pl-3 text-[11px] font-black text-[#111] uppercase tracking-wide">{label}</td>
        <td className="py-2 text-center text-[12px] font-black text-[#111]">{par || '—'}</td>
        <td className="py-2 text-center text-[12px] font-black text-[#C9A84C]">{yards || '—'}</td>
        <td />
      </tr>
    )
  }

  return (
    <div>
      {/* Tee selector */}
      {tees.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-b border-[#F0EAE0]">
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Select Tee</div>
          <div className="flex flex-wrap gap-1.5">
            {tees.map((tee, i) => (
              <button
                key={tee.teeID ?? i}
                onClick={() => setTeeIdx(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                  teeIdx === i
                    ? 'bg-white border-gray-300 text-[#111] shadow-sm'
                    : 'border-transparent text-gray-400 hover:text-[#111] hover:bg-[#F8F4EE]'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                  style={{ background: tee.teeColor || '#999' }}
                />
                {tee.teeName}
              </button>
            ))}
          </div>
          {/* Rating / slope for selected tee */}
          {(rating || slope) && (
            <div className="flex gap-4 mt-2 text-[11px] text-gray-400">
              {rating ? <span>Rating <span className="font-bold text-[#111]">{rating}</span></span> : null}
              {slope  ? <span>Slope <span className="font-bold text-[#111]">{slope}</span></span> : null}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#F0EAE0]">
            <th className="py-2 pl-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hole</th>
            <th className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Par</th>
            <th className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Yds</th>
            <th className="py-2 pr-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">HCP</th>
          </tr>
        </thead>
        <tbody>
          {front.map(h => <HoleRow key={holeNum(h)} h={h} />)}
          {front.length > 0 && <TotalsRow label="Out" par={front.reduce((s,h) => s+(h.Par??0),0)} yards={frontYards} />}
          {back.map(h => <HoleRow key={holeNum(h)} h={h} />)}
          {back.length > 0 && <TotalsRow label="In" par={back.reduce((s,h) => s+(h.Par??0),0)} yards={backYards} />}
          {holes.length > 0 && <TotalsRow label="Total" par={totalPar} yards={frontYards + backYards} />}
        </tbody>
      </table>
    </div>
  )
}

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const [query,          setQuery]          = useState('')
  const [stateCode,      setStateCode]      = useState('')
  const [city,           setCity]           = useState('')
  const [results,        setResults]        = useState<GolfCourse[]>([])
  const [searching,      setSearching]      = useState(false)
  const [selected,       setSelected]       = useState<GolfCourse | null>(null)
  const [detail,         setDetail]         = useState<CourseDetail | null>(null)
  const [loadingDetail,  setLoadingDetail]  = useState(false)
  const [error,          setError]          = useState('')
  const [visitedCourses, setVisitedCourses] = useState<VisitedCourse[]>([])
  const [activeTab,      setActiveTab]      = useState<'scorecard' | 'weather'>('scorecard')

  // Load courses from user's rounds
  useEffect(() => {
    supabase.from('rounds').select('course_name, total_score, created_at').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, VisitedCourse> = {}
        for (const r of data) {
          if (!r.course_name) continue
          if (!map[r.course_name]) map[r.course_name] = { name: r.course_name, count: 0, scores: [], lastPlayed: r.created_at }
          map[r.course_name].count++
          if (r.total_score) map[r.course_name].scores.push(r.total_score)
          if (r.created_at > map[r.course_name].lastPlayed) map[r.course_name].lastPlayed = r.created_at
        }
        setVisitedCourses(Object.values(map).sort((a, b) => b.count - a.count))
      })
  }, [])

  async function search(overrideQuery?: string, overrideState?: string) {
    const q  = (overrideQuery  ?? query).trim()
    const st = (overrideState  ?? stateCode).trim()
    if (!q && !st) return
    setSearching(true); setResults([]); setError('')
    try {
      const params = new URLSearchParams()
      if (q)  params.set('q', q)
      if (st) params.set('state', st)
      if (city.trim()) params.set('city', city.trim())
      const res  = await fetch(`/api/golf/search?${params.toString()}`)
      const data = await res.json()
      const list: GolfCourse[] = data.courses ?? []
      setResults(list)
      if (list.length === 1) pickCourse(list[0])
    } catch { setError('Search failed — please try again.') }
    finally  { setSearching(false) }
  }

  async function pickCourse(course: GolfCourse) {
    setSelected(course); setResults([]); setDetail(null); setLoadingDetail(true); setError('')
    try {
      const res  = await fetch(`/api/golf/course/${course.CourseID}`)
      const data: CourseDetail = await res.json()
      setDetail(data)
    } catch { setError('Could not load course details.') }
    finally  { setLoadingDetail(false) }
  }

  async function searchVisited(name: string) {
    setQuery(name)
    setSearching(true); setResults([]); setSelected(null); setDetail(null); setError('')
    try {
      const res  = await fetch(`/api/golf/search?q=${encodeURIComponent(name)}`)
      const data = await res.json()
      const list: GolfCourse[] = data.courses ?? []
      if (list.length > 0) pickCourse(list[0])
      else { setResults(list); setSearching(false) }
    } catch { setError('Search failed.'); setSearching(false) }
  }

  const holes   = detail?.Holes ?? detail?.holes ?? []
  const lat     = parseNum(detail?.Latitude  ?? selected?.Latitude)
  const lng     = parseNum(detail?.Longitude ?? selected?.Longitude)
  const name    = detail?.CourseName ?? detail?.ClubName ?? selected?.CourseName ?? selected?.ClubName ?? ''
  const loc     = [detail?.City ?? selected?.City, detail?.StateCode ?? selected?.StateCode].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-[#F0EAE0] px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h1 className="text-[22px] font-black text-[#111] tracking-tight leading-tight">Courses</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              Search any course for a satellite map, scorecard, and playing conditions
            </p>
          </div>
          {selected && (
            <button
              onClick={() => { setSelected(null); setDetail(null); setQuery(''); setStateCode(''); setCity(''); setResults([]) }}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-400 hover:text-[#111] transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={e => { e.preventDefault(); search() }} className="flex flex-wrap gap-2 max-w-3xl">
          {/* Name */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Course name…"
              className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl pl-10 pr-4 py-2.5 text-[13.5px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition"
            />
          </div>
          {/* State */}
          <select
            value={stateCode}
            onChange={e => setStateCode(e.target.value)}
            className="bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-3 py-2.5 text-[13.5px] text-[#111] focus:outline-none focus:border-[#C9A84C] transition cursor-pointer"
          >
            <option value="">Any State</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>{code} — {name}</option>
            ))}
          </select>
          {/* City (optional) */}
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="City (optional)"
            className="bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-2.5 text-[13.5px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition w-36"
          />
          <button
            type="submit"
            disabled={searching || (!query.trim() && !stateCode)}
            className="bg-[#C9A84C] hover:bg-[#A07828] disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-[13.5px] font-semibold transition-colors shrink-0 flex items-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4" /> Search</>}
          </button>
        </form>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── Left panel ── */}
        <div className="w-[280px] shrink-0 bg-white border-r border-[#F0EAE0] flex flex-col overflow-hidden">

          {/* Error */}
          {error && (
            <div className="mx-3 mt-3 flex items-center gap-2 text-[12px] text-red-500 bg-red-50 rounded-xl px-3 py-2.5 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          {/* Search results */}
          {results.length > 0 && (
            <div className="overflow-auto flex-1">
              <div className="px-4 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider border-b border-[#F8F4EE]">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.map(c => (
                <button
                  key={c.CourseID}
                  onClick={() => pickCourse(c)}
                  className="w-full text-left px-4 py-3 hover:bg-[#FAF7F2] transition-colors border-b border-[#F8F4EE] last:border-0"
                >
                  <div className="text-[13px] font-semibold text-[#111] leading-tight">{c.CourseName || c.ClubName}</div>
                  {(c.City || c.StateCode) && (
                    <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      {[c.City, c.StateCode].filter(Boolean).join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Visited courses */}
          {results.length === 0 && (
            <div className="flex-1 overflow-auto">
              {visitedCourses.length > 0 && (
                <>
                  <div className="px-4 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider border-b border-[#F8F4EE] sticky top-0 bg-white">
                    Your Courses
                  </div>
                  {visitedCourses.map(c => {
                    const best = c.scores.length ? Math.min(...c.scores) : null
                    const isActive = name === c.name
                    return (
                      <button
                        key={c.name}
                        onClick={() => searchVisited(c.name)}
                        className={`w-full text-left px-4 py-3 transition-colors border-b border-[#F8F4EE] last:border-0 ${isActive ? 'bg-[#FEF3E8]' : 'hover:bg-[#FAF7F2]'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: courseColor(c.name) }} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-[12.5px] font-semibold leading-tight truncate ${isActive ? 'text-[#C9A84C]' : 'text-[#111]'}`}>
                              {c.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10.5px] text-gray-400">{c.count} round{c.count !== 1 ? 's' : ''}</span>
                              {best && <span className="text-[10.5px] text-[#C9A84C] font-semibold">Best {best}</span>}
                            </div>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#C9A84C]' : 'text-gray-300'}`} />
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 pl-11 text-[10px] text-gray-400">
                          <Clock className="w-2.5 h-2.5" />
                          {format(new Date(c.lastPlayed), 'MMM d, yyyy')}
                        </div>
                      </button>
                    )
                  })}
                </>
              )}

              {visitedCourses.length === 0 && !searching && (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5EFE0] flex items-center justify-center mx-auto mb-3">
                    <Flag className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div className="text-[13px] font-semibold text-[#333] mb-1">No courses yet</div>
                  <p className="text-[11.5px] text-gray-400 leading-relaxed">
                    Track rounds in the app and your courses will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* No course selected */}
          {!selected && !loadingDetail && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#F5EFE0] flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-[#C9A84C]" />
                </div>
                <div className="text-[16px] font-black text-[#111] mb-1.5">Select a course to preview</div>
                <p className="text-[13px] text-gray-400 max-w-[300px] mx-auto leading-relaxed">
                  Search any golf course or pick one from your history on the left to see the satellite map, scorecard, and playing conditions.
                </p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loadingDetail && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin mx-auto mb-3" />
                <p className="text-[13px] text-gray-400">Loading course data…</p>
              </div>
            </div>
          )}

          {/* Course loaded */}
          {selected && !loadingDetail && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Course header */}
              <div className="bg-white border-b border-[#F0EAE0] px-6 py-3.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: courseColor(name) }} />
                    <div>
                      <div className="text-[17px] font-black text-[#111] leading-tight">{name}</div>
                      <div className="flex items-center gap-3 text-[11.5px] text-gray-400 mt-0.5">
                        {loc && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{loc}</span>}
                        {detail?.Par    && <span>Par {detail.Par}</span>}
                        {detail?.Rating && <span>Rating {detail.Rating}</span>}
                        {detail?.Slope  && <span>Slope {detail.Slope}</span>}
                        {holes.length > 0 && <span>{holes.length} holes</span>}
                        {(detail?.Tees?.length ?? 0) > 0 && <span>{detail!.Tees!.length} tees</span>}
                        {detail?.website && (
                          <a href={detail.website} target="_blank" rel="noopener noreferrer"
                            className="text-[#C9A84C] hover:underline">Website ↗</a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center bg-[#F8F4EE] rounded-xl p-1 gap-1">
                    {(['scorecard', 'weather'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${
                          activeTab === t
                            ? 'bg-white text-[#111] shadow-sm'
                            : 'text-gray-400 hover:text-[#111]'
                        }`}
                      >
                        {t === 'weather' ? '⛅ Conditions' : '📋 Scorecard'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Map + side panel */}
              <div className="flex-1 flex overflow-hidden">

                {/* Satellite map */}
                <div className="flex-1 relative">
                  {lat && lng ? (
                    <>
                      <CourseMapbox lat={lat} lng={lng} holes={holes} />
                      {holes.length > 0 && (
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-3 pointer-events-none">
                          <div className="flex items-center gap-1.5 text-[10.5px] text-white font-medium">
                            <div className="w-[13px] h-[13px] rounded-[4px] border border-[#C9A84C] bg-black/80 shrink-0" />
                            Tee box
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-white font-medium">
                            <div className="w-3 h-3 rounded-full bg-[#22C55E] border border-white shrink-0" /> Green
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#F8F4EE]">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 text-[#C9A84C] mx-auto mb-2" />
                        <p className="text-[13px] text-gray-400">No GPS coordinates available for this course</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right panel: scorecard or weather */}
                <div className="w-[280px] shrink-0 bg-white border-l border-[#F0EAE0] overflow-auto">
                  {activeTab === 'scorecard' ? (
                    holes.length > 0 ? (
                      <Scorecard holes={holes} tees={detail?.Tees ?? []} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-10 px-5 text-center">
                        <Trophy className="w-8 h-8 text-[#C9A84C] mx-auto mb-2" />
                        <p className="text-[12.5px] text-gray-400">Hole data not available for this course.</p>
                      </div>
                    )
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CloudSun className="w-4 h-4 text-[#C9A84C]" />
                        <span className="text-[13px] font-bold text-[#111]">Playing Conditions</span>
                      </div>
                      {lat && lng ? (
                        <WeatherWidget lat={lat} lng={lng} courseName={name} />
                      ) : (
                        <p className="text-[12.5px] text-gray-400">No location data to fetch weather.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
