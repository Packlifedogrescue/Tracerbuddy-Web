'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { track } from '@/lib/analytics'
import {
  Search, MapPin, Flag, Loader2, AlertCircle,
  ChevronRight, Clock, Trophy, X, CloudSun,
  Phone, Mail, Globe, Info,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import WeatherWidget from '@/components/WeatherWidget'
import type { TeeData, CoursePolygon } from '@/components/CourseMapkit'

const CourseMapbox = dynamic(() => import('@/components/CourseMapkit'), { ssr: false })

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
  ParFemale?: number
  Yardage?: number
  Yards?: number
  Handicap?: number
  HandicapFemale?: number
  TeeLatitude?: string | number
  TeeLongitude?: string | number
  GreenLatitude?: string | number
  GreenLongitude?: string | number
  Waypoints?: { lat: number; lng: number }[]
  LayupSpots?: { lat: number; lng: number; yards: number | null }[]
}

interface GolfTee {
  teeID: string
  teeName: string
  teeColor: string
  courseRatingMen?: number | string
  slopeMen?: number | string
  courseRatingWomen?: number | string
  slopeWomen?: number | string
  [key: string]: any
}

interface CourseDetail {
  CourseID?: string
  ClubName?: string
  CourseName?: string
  Address?: string
  City?: string
  StateCode?: string
  Zip?: string
  Country?: string
  Rating?: number | string
  Slope?: number | string
  Par?: number
  Holes?: GolfHole[]
  holes?: GolfHole[]
  Tees?: GolfTee[]
  Latitude?: string | number
  Longitude?: string | number
  polygons?: CoursePolygon[]
  CourseType?: string
  NumHoles?: number
  Architect?: string
  YearBuilt?: number | string
  PriceRange?: string
  Telephone?: string
  Email?: string
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

function formatCourseType(t: string): string {
  const map: Record<string, string> = {
    public: 'Public', private: 'Private', 'semi-private': 'Semi-Private',
    semi_private: 'Semi-Private', resort: 'Resort', military: 'Military',
    municipal: 'Municipal', daily_fee: 'Daily Fee',
  }
  return map[t?.toLowerCase()] ?? t
}

const PALETTE = ['#2D6A4F','#6B9E5E','#4A7C59','#C9A84C','#8B7355','#5B8A65','#A07340','#607D4A','#3D7A6E','#7A6030']
function courseColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// ── Scorecard ─────────────────────────────────────────────────────────────────
function Scorecard({ holes, tees = [], selectedHole, onHoleClick }: {
  holes: GolfHole[]
  tees?: GolfTee[]
  selectedHole?: number
  onHoleClick?: (n: number) => void
}) {
  const [teeIdx, setTeeIdx] = useState(0)
  const [gender, setGender] = useState<'men' | 'women'>('men')
  const activeTee     = tees[teeIdx]
  const hasFemaleData = holes.some(h => h.ParFemale != null)

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
  const totalPar   = holes.reduce((s, h) => s + ((gender === 'women' ? h.ParFemale : h.Par) ?? 0), 0)

  const rating = gender === 'women'
    ? (activeTee?.courseRatingWomen ?? activeTee?.courseRatingMen)
    : activeTee?.courseRatingMen
  const slope = gender === 'women'
    ? (activeTee?.slopeWomen ?? activeTee?.slopeMen)
    : activeTee?.slopeMen

  function HoleRow({ h }: { h: GolfHole }) {
    const n      = holeNum(h)
    const yds    = getYards(n, h)
    const par    = (gender === 'women' ? h.ParFemale : h.Par) ?? 0
    const hcp    = gender === 'women' ? h.HandicapFemale : h.Handicap
    const active = selectedHole === n
    return (
      <tr
        onClick={() => onHoleClick?.(n)}
        className={`transition-colors border-b border-[#F8F4EE] last:border-0 cursor-pointer ${
          active ? 'bg-[#FEF3D8]' : 'hover:bg-[#F8F4EE]'
        }`}
      >
        <td className="py-1.5 pl-3">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black transition-all ${
            active ? 'bg-[#C9A84C] text-white shadow-sm' : 'bg-[#F8F4EE] text-[#666]'
          }`}>{n}</div>
        </td>
        <td className="py-1.5 text-center">
          <span className={`text-[12px] font-bold ${
            active ? 'text-[#C9A84C]' : par === 3 ? 'text-blue-500' : par === 5 ? 'text-[#22A06B]' : 'text-[#111]'
          }`}>{par || '—'}</span>
        </td>
        <td className="py-1.5 text-center text-[12px] font-medium text-gray-600">{yds ?? '—'}</td>
        <td className="py-1.5 pr-3 text-center text-[11px] text-gray-400">{hcp ?? '—'}</td>
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
                <div className="w-3 h-3 rounded-full border border-black/15 shrink-0" style={{ background: tee.teeColor || '#999' }} />
                {tee.teeName}
              </button>
            ))}
          </div>

          {hasFemaleData && (
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Playing as</span>
              <div className="flex bg-[#F0EAE0] rounded-lg p-0.5">
                {(['men', 'women'] as const).map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      gender === g ? 'bg-white text-[#111] shadow-sm' : 'text-gray-400 hover:text-[#111]'
                    }`}
                  >
                    {g === 'men' ? '♂ Men' : '♀ Women'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(rating || slope) && (
            <div className="flex gap-4 mt-2 text-[11px] text-gray-400">
              {rating ? <span>Rating <span className="font-bold text-[#111]">{rating}</span></span> : null}
              {slope  ? <span>Slope <span className="font-bold text-[#111]">{slope}</span></span> : null}
            </div>
          )}
        </div>
      )}

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
          {front.length > 0 && <TotalsRow label="Out" par={front.reduce((s,h)=>s+((gender==='women'?h.ParFemale:h.Par)??0),0)} yards={frontYards} />}
          {back.map(h => <HoleRow key={holeNum(h)} h={h} />)}
          {back.length > 0 && <TotalsRow label="In" par={back.reduce((s,h)=>s+((gender==='women'?h.ParFemale:h.Par)??0),0)} yards={backYards} />}
          {holes.length > 0 && <TotalsRow label="Total" par={totalPar} yards={frontYards + backYards} />}
        </tbody>
      </table>
    </div>
  )
}

// ── Course Info Panel ─────────────────────────────────────────────────────────
function CourseInfoPanel({ detail, lat, lng }: { detail: CourseDetail; lat: number | null; lng: number | null }) {
  const rows: { label: string; value: string; href?: string }[] = []

  if (detail.CourseType)
    rows.push({ label: 'Type', value: formatCourseType(detail.CourseType) })
  if (detail.NumHoles)
    rows.push({ label: 'Holes', value: String(detail.NumHoles) })
  if (detail.Architect)
    rows.push({ label: 'Architect', value: detail.Architect })
  if (detail.YearBuilt)
    rows.push({ label: 'Est.', value: String(detail.YearBuilt) })
  if (detail.PriceRange)
    rows.push({ label: 'Green Fees', value: detail.PriceRange })

  const phone   = detail.Telephone ?? detail.telephone
  const email   = detail.Email
  const website = detail.website
  const address = detail.Address
    ? [detail.Address, detail.City, detail.StateCode, detail.Zip].filter(Boolean).join(', ')
    : null
  const mapsUrl = address
    ? `https://maps.apple.com/?q=${encodeURIComponent(address)}`
    : lat && lng
    ? `https://maps.apple.com/?ll=${lat},${lng}`
    : null

  return (
    <div className="p-4 space-y-5">
      {/* Course details grid */}
      {rows.length > 0 && (
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">Course Details</div>
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-[11.5px] text-gray-400">{r.label}</span>
                <span className="text-[11.5px] font-semibold text-[#111]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {(phone || email || website || mapsUrl) && (
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">Contact</div>
          <div className="space-y-2">
            {mapsUrl && address && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2.5 text-[11.5px] text-[#C9A84C] hover:underline">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="leading-tight">{address}</span>
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-2.5 text-[11.5px] text-gray-600 hover:text-[#111]">
                <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2.5 text-[11.5px] text-gray-600 hover:text-[#111]">
                <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                {email}
              </a>
            )}
            {website && (
              <a href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-[11.5px] text-[#C9A84C] hover:underline">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                {website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      )}

      {rows.length === 0 && !phone && !email && !website && !mapsUrl && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Info className="w-8 h-8 text-[#C9A84C] mx-auto mb-2 opacity-40" />
          <p className="text-[12.5px] text-gray-400">No additional info available for this course.</p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const [query,          setQuery]          = useState('')
  const [region,         setRegion]         = useState('')
  const [city,           setCity]           = useState('')
  const [results,        setResults]        = useState<GolfCourse[]>([])
  const [searching,      setSearching]      = useState(false)
  const [selected,       setSelected]       = useState<GolfCourse | null>(null)
  const [detail,         setDetail]         = useState<CourseDetail | null>(null)
  const [loadingDetail,  setLoadingDetail]  = useState(false)
  const [error,          setError]          = useState('')
  const [visitedCourses, setVisitedCourses] = useState<VisitedCourse[]>([])
  const [activeTab,      setActiveTab]      = useState<'scorecard' | 'weather' | 'info'>('scorecard')
  const [selectedHole,   setSelectedHole]   = useState<number | undefined>(undefined)

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

  async function search(overrideQuery?: string, overrideRegion?: string) {
    const q  = (overrideQuery  ?? query).trim()
    const rg = (overrideRegion ?? region).trim()
    const ct = city.trim()
    if (!q && !rg && !ct) return
    setSearching(true); setResults([]); setSelected(null); setDetail(null); setError('')
    try {
      const params = new URLSearchParams()
      if (q)  params.set('q', q)
      if (rg) params.set('state', rg)
      if (ct) params.set('city', ct)
      const res  = await fetch(`/api/golf/search?${params.toString()}`)
      const data = await res.json()
      const list: GolfCourse[] = data.courses ?? []
      setResults(list)
      track('course_searched', { query: q, region: rg, results: list.length })
      if (list.length === 0) setError('No courses found — try a different name or country.')
    } catch { setError('Search failed — please try again.') }
    finally  { setSearching(false) }
  }

  async function pickCourse(course: GolfCourse) {
    setSelected(course); setResults([]); setDetail(null); setLoadingDetail(true); setError(''); setSelectedHole(undefined)
    track('course_viewed', { course_id: course.CourseID, course_name: course.CourseName || course.ClubName, city: course.City, state: course.StateCode })
    try {
      const res  = await fetch(`/api/golf/course?id=${encodeURIComponent(course.CourseID)}`)
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

  const processedTees: TeeData[] = (detail?.Tees ?? []).map(t => ({
    name:     t.teeName  ?? 'Tee',
    color:    t.teeColor ?? undefined,
    yardages: Array.from({ length: 18 }, (_, i) => {
      const v = t[`length${i + 1}`]
      return v != null && Number(v) > 0 ? Number(v) : null
    }),
  }))

  const selectedHoleData = selectedHole ? holes.find(h => holeNum(h) === selectedHole) : null

  const holeYardageRows = (() => {
    if (!selectedHole || processedTees.length === 0) return []
    const relevant = processedTees
      .map(t => ({ name: t.name, color: t.color, yds: t.yardages[selectedHole - 1] }))
      .filter(t => t.yds != null && t.yds > 0)
      .sort((a, b) => (b.yds ?? 0) - (a.yds ?? 0))
    if (relevant.length === 0) return []
    return relevant.map(r => ({ label: r.name, ...r }))
  })()

  const personalRecord = visitedCourses.find(c => c.name === name)
  const personalBest   = personalRecord && personalRecord.scores.length > 0
    ? Math.min(...personalRecord.scores)
    : null

  const TABS = [
    { id: 'scorecard', label: '📋 Scorecard' },
    { id: 'weather',   label: '⛅ Conditions' },
    { id: 'info',      label: 'ℹ️ Info' },
  ] as const

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-[#F0EAE0] px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h1 className="text-[22px] font-black text-[#111] tracking-tight leading-tight">Courses</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              Search 42,000+ courses worldwide for a satellite map, scorecard, and playing conditions
            </p>
          </div>
          {selected && (
            <button
              onClick={() => { setSelected(null); setDetail(null); setQuery(''); setRegion(''); setCity(''); setResults([]) }}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-400 hover:text-[#111] transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <form onSubmit={e => { e.preventDefault(); search() }} className="flex flex-wrap gap-2 max-w-3xl">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Course name…"
              className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl pl-10 pr-4 py-2.5 text-[13.5px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition"
            />
          </div>
          <input
            value={region}
            onChange={e => setRegion(e.target.value)}
            placeholder="State or Country (optional)"
            className="bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-2.5 text-[13.5px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition w-52"
          />
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="City"
            className="bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-2.5 text-[13.5px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition w-36"
          />
          <button
            type="submit"
            disabled={searching || (!query.trim() && !region.trim() && !city.trim())}
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
          {error && (
            <div className="mx-3 mt-3 flex items-center gap-2 text-[12px] text-red-500 bg-red-50 rounded-xl px-3 py-2.5 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          {results.length > 0 && (
            <div className="overflow-auto flex-1">
              <div className="px-4 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider border-b border-[#F8F4EE]">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.map(c => (
                <button key={c.CourseID} onClick={() => pickCourse(c)}
                  className="w-full text-left px-4 py-3 hover:bg-[#FAF7F2] transition-colors border-b border-[#F8F4EE] last:border-0">
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
                      <button key={c.name} onClick={() => searchVisited(c.name)}
                        className={`w-full text-left px-4 py-3 transition-colors border-b border-[#F8F4EE] last:border-0 ${isActive ? 'bg-[#FEF3E8]' : 'hover:bg-[#FAF7F2]'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: courseColor(c.name) }} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-[12.5px] font-semibold leading-tight truncate ${isActive ? 'text-[#C9A84C]' : 'text-[#111]'}`}>{c.name}</div>
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
                  <p className="text-[11.5px] text-gray-400 leading-relaxed">Track rounds in the app and your courses will appear here.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

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

          {loadingDetail && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin mx-auto mb-3" />
                <p className="text-[13px] text-gray-400">Loading course data…</p>
              </div>
            </div>
          )}

          {selected && !loadingDetail && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Course header */}
              <div className="bg-white border-b border-[#F0EAE0] px-6 py-3.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: courseColor(name) }} />
                    <div>
                      <div className="text-[17px] font-black text-[#111] leading-tight">{name}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-gray-400 mt-0.5">
                        {loc && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{loc}</span>}
                        {detail?.Par    && <span>Par {detail.Par}</span>}
                        {detail?.Rating && <span>Rating {detail.Rating}</span>}
                        {detail?.Slope  && <span>Slope {detail.Slope}</span>}
                        {(detail?.NumHoles ?? holes.length) > 0 && (
                          <span>{detail?.NumHoles ?? holes.length} holes</span>
                        )}
                        {(detail?.Tees?.length ?? 0) > 0 && <span>{detail!.Tees!.length} tees</span>}
                        {detail?.CourseType && (
                          <span className="px-1.5 py-0.5 bg-[#F0EAE0] rounded-md text-[10px] font-bold text-[#666]">
                            {formatCourseType(detail.CourseType)}
                          </span>
                        )}
                        {detail?.Architect && <span>🏌️ {detail.Architect}</span>}
                        {detail?.YearBuilt && <span>Est. {detail.YearBuilt}</span>}
                        {personalBest != null && (
                          <span className="flex items-center gap-1 text-[#C9A84C] font-semibold">
                            <Trophy className="w-3 h-3" />
                            Best {personalBest}
                            {personalRecord && personalRecord.count > 1 && (
                              <span className="font-normal text-gray-400">({personalRecord.count} rounds)</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center bg-[#F8F4EE] rounded-xl p-1 gap-1">
                    {TABS.map(t => (
                      <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all ${
                          activeTab === t.id ? 'bg-white text-[#111] shadow-sm' : 'text-gray-400 hover:text-[#111]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Map + side panel */}
              <div className="flex-1 flex overflow-hidden">

                {/* Satellite map */}
                <div className="flex-1 relative m-3 rounded-2xl overflow-hidden shadow-2xl">
                  {lat && lng ? (
                    <CourseMapbox
                      lat={lat} lng={lng} holes={holes} courseName={name}
                      selectedHole={selectedHole}
                      onHoleClick={n => setSelectedHole(prev => prev === n ? undefined : n)}
                      tees={processedTees.length > 0 ? processedTees : undefined}
                      polygons={detail?.polygons}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#F8F4EE] rounded-2xl">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 text-[#C9A84C] mx-auto mb-2" />
                        <p className="text-[13px] text-gray-400">No GPS coordinates available for this course</p>
                      </div>
                    </div>
                  )}

                  {/* Hole number jump bar */}
                  {holes.length > 0 && lat && lng && (
                    <div className="absolute bottom-7 left-0 right-0 z-10">
                      <div className="flex items-center justify-around bg-black/80 backdrop-blur-md px-2 py-1.5 shadow-xl rounded-b-lg">
                        {[...holes].sort((a, b) => holeNum(a) - holeNum(b)).map(h => {
                          const n = holeNum(h)
                          const active = selectedHole === n
                          return (
                            <button key={n}
                              onClick={() => setSelectedHole(prev => prev === n ? undefined : n)}
                              className={`flex-1 h-6 rounded-md text-[9px] font-black transition-all ${
                                active ? 'bg-[#C9A84C] text-white scale-110' : 'text-white/55 hover:text-white hover:bg-white/15'
                              }`}
                            >
                              {n}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right panel */}
                <div className="w-[280px] shrink-0 bg-white border-l border-[#F0EAE0] overflow-auto">

                  {/* Hole yardage summary */}
                  {selectedHoleData && holeYardageRows.length > 0 && (
                    <div className="bg-[#FEF9EE] border-b border-[#EDD98A] px-3 py-3">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#C9A84C] rounded-md flex items-center justify-center text-white text-[10px] font-black leading-none">
                            {selectedHole}
                          </div>
                          <span className="text-[12px] font-bold text-[#111]">Hole {selectedHole}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Par <span className="font-bold text-[#111]">{selectedHoleData.Par ?? '—'}</span>
                          {selectedHoleData.Handicap != null && (
                            <span className="ml-2">HCP <span className="font-bold text-[#111]">{selectedHoleData.Handicap}</span></span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {holeYardageRows.map(row => (
                          <div key={row.label} className="flex-1 bg-white rounded-xl border border-[#EDE8DC] px-2 py-2 text-center">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{row.label}</div>
                            <div className="text-[17px] font-black text-[#C9A84C] leading-none">{row.yds}</div>
                            <div className="text-[9px] text-gray-400 mt-0.5">yds</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'scorecard' && (
                    holes.length > 0 ? (
                      <Scorecard holes={holes} tees={detail?.Tees ?? []} selectedHole={selectedHole}
                        onHoleClick={n => setSelectedHole(prev => prev === n ? undefined : n)} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-10 px-5 text-center">
                        <Trophy className="w-8 h-8 text-[#C9A84C] mx-auto mb-2" />
                        <p className="text-[12.5px] text-gray-400">Hole data not available for this course.</p>
                      </div>
                    )
                  )}

                  {activeTab === 'weather' && (
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

                  {activeTab === 'info' && detail && (
                    <CourseInfoPanel detail={detail} lat={lat} lng={lng} />
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
