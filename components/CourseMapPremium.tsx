'use client'
import { useEffect, useRef, useState } from 'react'
import { X, MapPin, Search, Flag, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

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

function holeNum(h: GolfHole) {
  return h.HoleNo ?? h.Number ?? 0
}

function holeYards(h: GolfHole) {
  return h.Yardage ?? h.Yards ?? null
}

// ── Scorecard ─────────────────────────────────────────────────────────────────
function Scorecard({ holes, active, onSelect }: {
  holes: GolfHole[]
  active: number | null
  onSelect: (n: number) => void
}) {
  const sorted = [...holes].sort((a, b) => holeNum(a) - holeNum(b))
  const front  = sorted.filter(h => holeNum(h) <= 9)
  const back   = sorted.filter(h => holeNum(h) > 9)

  function HoleRow({ h }: { h: GolfHole }) {
    const n = holeNum(h)
    const isActive = active === n
    return (
      <tr
        key={n}
        onClick={() => onSelect(n)}
        className={`cursor-pointer transition-colors ${isActive ? 'bg-[#FEF3E8]' : 'hover:bg-[#F8F4EE]'}`}
      >
        <td className={`py-1.5 pl-3 text-[12px] font-bold ${isActive ? 'text-[#C9A84C]' : 'text-[#111]'}`}>{n}</td>
        <td className="py-1.5 text-center text-[12px] text-[#111]">{h.Par ?? '—'}</td>
        <td className="py-1.5 text-center text-[12px] text-gray-500">{holeYards(h) ?? '—'}</td>
        <td className="py-1.5 pr-3 text-center text-[11px] text-gray-400">{h.Handicap ?? '—'}</td>
      </tr>
    )
  }

  function TotalsRow({ label, hs }: { label: string; hs: GolfHole[] }) {
    const totPar  = hs.reduce((s, h) => s + (h.Par ?? 0), 0)
    const totYds  = hs.reduce((s, h) => s + (holeYards(h) ?? 0), 0)
    return (
      <tr className="bg-[#F8F4EE]">
        <td className="py-1.5 pl-3 text-[11px] font-black text-[#111] uppercase tracking-wide">{label}</td>
        <td className="py-1.5 text-center text-[12px] font-bold text-[#111]">{totPar || '—'}</td>
        <td className="py-1.5 text-center text-[12px] font-bold text-gray-500">{totYds || '—'}</td>
        <td />
      </tr>
    )
  }

  return (
    <div className="overflow-auto max-h-[420px]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#F0EAE0]">
            <th className="py-2 pl-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hole</th>
            <th className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Par</th>
            <th className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Yds</th>
            <th className="py-2 pr-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">HCP</th>
          </tr>
        </thead>
        <tbody>
          {front.map(h => <HoleRow key={holeNum(h)} h={h} />)}
          {front.length > 0 && <TotalsRow label="Out" hs={front} />}
          {back.map(h => <HoleRow key={holeNum(h)} h={h} />)}
          {back.length > 0 && <TotalsRow label="In" hs={back} />}
          {holes.length > 0 && <TotalsRow label="Total" hs={holes} />}
        </tbody>
      </table>
    </div>
  )
}

// ── Leaflet Map ───────────────────────────────────────────────────────────────
function LeafletMap({ lat, lng, holes }: {
  lat: number
  lng: number
  holes: GolfHole[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markersRef   = useRef<any[]>([])

  useEffect(() => {
    if (!containerRef.current) return
    // Leaflet must be imported dynamically (no SSR)
    import('leaflet').then(L => {
      // Fix default icon paths broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      })
      mapRef.current = map

      // ESRI World Imagery (satellite, free, no key required)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20 }
      ).addTo(map)

      // Thin labels overlay
      L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20, opacity: 0.6 }
      ).addTo(map)

      // Hole markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      holes.forEach(h => {
        const n    = holeNum(h)
        const tLat = parseNum(h.TeeLatitude)
        const tLng = parseNum(h.TeeLongitude)
        const gLat = parseNum(h.GreenLatitude)
        const gLng = parseNum(h.GreenLongitude)

        if (tLat && tLng) {
          const teeIcon = L.divIcon({
            html: `<div style="
              background:#3B82F6;border:2px solid white;border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);width:18px;height:18px;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
            "><span style="transform:rotate(45deg);font-size:9px;font-weight:900;color:white;display:block;text-align:center;line-height:14px">${n}</span></div>`,
            className: '',
            iconSize: [18, 18],
            iconAnchor: [9, 18],
          })
          const m = L.marker([tLat, tLng], { icon: teeIcon })
            .bindTooltip(`Hole ${n} Tee · Par ${h.Par ?? '—'} · ${holeYards(h) ?? '—'} yds`, { direction: 'top' })
          m.addTo(map)
          markersRef.current.push(m)
        }

        if (gLat && gLng) {
          const greenIcon = L.divIcon({
            html: `<div style="
              background:#22A06B;border:2px solid white;border-radius:50%;
              width:14px;height:14px;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
            "></div>`,
            className: '',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })
          const m = L.marker([gLat, gLng], { icon: greenIcon })
            .bindTooltip(`Hole ${n} Green`, { direction: 'top' })
          m.addTo(map)
          markersRef.current.push(m)
        }

        // Draw line tee → green
        if (tLat && tLng && gLat && gLng) {
          const line = L.polyline([[tLat, tLng], [gLat, gLng]], {
            color: 'rgba(255,255,255,0.35)',
            weight: 1.5,
            dashArray: '4 4',
          })
          line.addTo(map)
          markersRef.current.push(line)
        }
      })
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [lat, lng, holes])

  return <div ref={containerRef} className="w-full h-full" />
}

// ── Search Result Item ────────────────────────────────────────────────────────
function SearchResult({ course, onSelect }: {
  course: GolfCourse
  onSelect: () => void
}) {
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
export default function CourseMapPremium({
  initialName,
  onClose,
}: {
  initialName?: string
  onClose: () => void
}) {
  const [query,     setQuery]     = useState(initialName ?? '')
  const [results,   setResults]   = useState<GolfCourse[]>([])
  const [searching, setSearching] = useState(false)
  const [selected,  setSelected]  = useState<GolfCourse | null>(null)
  const [detail,    setDetail]    = useState<CourseDetail | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [activeHole, setActiveHole] = useState<number | null>(null)
  const [tab,       setTab]       = useState<'map' | 'scorecard'>('map')

  // Auto-search when opened with a course name
  useEffect(() => {
    if (initialName) search(initialName)
  }, [])

  async function search(q = query) {
    if (!q.trim()) return
    setSearching(true)
    setResults([])
    setSelected(null)
    setDetail(null)
    setError('')
    try {
      const res  = await fetch(`/api/golf/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      const list: GolfCourse[] = data.courses ?? []
      setResults(list)
      if (list.length === 1) pickCourse(list[0])
    } catch {
      setError('Search failed — please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function pickCourse(course: GolfCourse) {
    setSelected(course)
    setResults([])
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/golf/course/${course.CourseID}`)
      const data: CourseDetail = await res.json()
      setDetail(data)
    } catch {
      setError('Could not load course details.')
    } finally {
      setLoading(false)
    }
  }

  function flyToHole(n: number) {
    setActiveHole(n)
    setTab('map')
  }

  const holes   = detail?.Holes ?? detail?.holes ?? []
  const lat     = parseNum(detail?.Latitude  ?? selected?.Latitude)
  const lng     = parseNum(detail?.Longitude ?? selected?.Longitude)
  const hasMap  = lat != null && lng != null
  const name    = detail?.CourseName ?? detail?.ClubName ?? selected?.CourseName ?? selected?.ClubName ?? ''
  const loc     = [detail?.City ?? selected?.City, detail?.StateCode ?? selected?.StateCode].filter(Boolean).join(', ')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 860, maxHeight: '92vh', height: selected ? '92vh' : 'auto' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0EAE0] shrink-0">
          {selected && (
            <button
              onClick={() => { setSelected(null); setDetail(null); setError('') }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#F0EAE0] transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-[#F5EFE0] flex items-center justify-center shrink-0">
            <Flag className="w-4 h-4 text-[#C9A84C]" />
          </div>
          <div className="flex-1 min-w-0">
            {selected ? (
              <>
                <div className="text-[15px] font-black text-[#111] leading-tight truncate">{name}</div>
                <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                  {loc && <><MapPin className="w-2.5 h-2.5" />{loc}</>}
                  {detail?.Rating && <span>· Rating {detail.Rating}</span>}
                  {detail?.Slope  && <span>· Slope {detail.Slope}</span>}
                  {detail?.Par    && <span>· Par {detail.Par}</span>}
                </div>
              </>
            ) : (
              <span className="text-[15px] font-black text-[#111]">Course Map Preview</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-[#F0EAE0] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-[#F0EAE0] shrink-0">
          <form onSubmit={e => { e.preventDefault(); search() }} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search any golf course…"
                className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-[#C9A84C] hover:bg-[#A07828] text-white rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60 shrink-0"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-3 flex items-center gap-2 text-[12.5px] text-red-500 bg-red-50 rounded-xl px-4 py-3 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Search results list */}
        {results.length > 0 && !selected && (
          <div className="overflow-auto">
            <div className="px-5 py-2 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider border-b border-[#F8F4EE]">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
            {results.map(c => (
              <SearchResult key={c.CourseID} course={c} onSelect={() => pickCourse(c)} />
            ))}
          </div>
        )}

        {/* No results */}
        {!searching && !selected && results.length === 0 && query && (
          <div className="flex-1 flex items-center justify-center text-center py-10 px-6">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#F5EFE0] flex items-center justify-center mx-auto mb-3">
                <Flag className="w-5 h-5 text-[#C9A84C]" />
              </div>
              <div className="text-[14px] font-semibold text-[#333] mb-1">No courses found</div>
              <p className="text-[12px] text-gray-400">Try a different spelling or city name.</p>
            </div>
          </div>
        )}

        {/* Loading course detail */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-gray-400">Loading course data…</p>
            </div>
          </div>
        )}

        {/* Course detail: map + scorecard */}
        {selected && !loading && (
          <div className="flex flex-col sm:flex-row flex-1 min-h-0">

            {/* Map / scorecard tabs on mobile */}
            <div className="sm:hidden flex border-b border-[#F0EAE0] shrink-0">
              {(['map', 'scorecard'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-[12.5px] font-semibold capitalize transition-colors ${
                    tab === t ? 'text-[#C9A84C] border-b-2 border-[#C9A84C]' : 'text-gray-400'
                  }`}
                >
                  {t === 'map' ? 'Satellite Map' : 'Scorecard'}
                </button>
              ))}
            </div>

            {/* Satellite map */}
            <div className={`flex-1 min-h-0 relative ${tab === 'scorecard' ? 'hidden sm:block' : ''}`}>
              {hasMap ? (
                <LeafletMap lat={lat!} lng={lng!} holes={holes} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#F8F4EE]">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-[#C9A84C] mx-auto mb-2" />
                    <p className="text-[13px] text-gray-400">No GPS coordinates available</p>
                  </div>
                </div>
              )}
              {/* Legend */}
              {hasMap && holes.length > 0 && (
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-3 pointer-events-none">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-white font-medium">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6] border border-white" /> Tee
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-white font-medium">
                    <div className="w-3 h-3 rounded-full bg-[#22A06B] border border-white" /> Green
                  </div>
                </div>
              )}
            </div>

            {/* Scorecard panel */}
            <div className={`sm:w-[220px] shrink-0 border-l border-[#F0EAE0] flex flex-col ${tab === 'map' ? 'hidden sm:flex' : 'flex'}`}>
              <div className="px-4 py-3 border-b border-[#F0EAE0] shrink-0">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Scorecard</div>
              </div>
              {holes.length > 0 ? (
                <Scorecard
                  holes={holes}
                  active={activeHole}
                  onSelect={n => flyToHole(n)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                  <p className="text-[12px] text-gray-400">Hole-by-hole data not available for this course.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state (no search yet) */}
        {!selected && !searching && results.length === 0 && !query && (
          <div className="flex items-center justify-center py-12 px-6 text-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#F5EFE0] flex items-center justify-center mx-auto mb-3.5">
                <Flag className="w-6 h-6 text-[#C9A84C]" />
              </div>
              <div className="text-[14.5px] font-bold text-[#111] mb-1">Explore Any Course</div>
              <p className="text-[12.5px] text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                Search for a golf course to see its satellite map, hole layout, and full scorecard.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
