'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase, fetchClubProfiles } from '@/lib/supabase'
import { useRealtime } from '@/lib/useRealtime'
import { Plus, Trash2 } from 'lucide-react'
import { track } from '@/lib/analytics'

const BRANDS = [
  'TaylorMade', 'Callaway', 'Titleist', 'Ping', 'Cleveland',
  'Cobra', 'Mizuno', 'Srixon', 'Wilson', 'Nike', 'Bridgestone',
  'PXG', 'Honma', 'Tour Edge', 'Adams', 'Ben Hogan', 'Yonex',
]

const CLUB_TYPES = [
  // Woods
  'Driver', 'Mini Driver',
  '2 Wood', '3 Wood', '4 Wood', '5 Wood', '7 Wood', '9 Wood',
  // Hybrids
  '1 Hybrid', '2 Hybrid', '3 Hybrid', '4 Hybrid', '5 Hybrid', '6 Hybrid', '7 Hybrid',
  // Driving / Utility Irons
  'Driving Iron', '1 Iron', '2 Iron', '3 Iron', '4 Iron',
  // Irons
  '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron',
  // Wedges (by loft)
  'Pitching Wedge',
  '44° Wedge', '45° Wedge', '46° Wedge', '47° Wedge', '48° Wedge',
  '49° Wedge', '50° Wedge', '51° Wedge', '52° Wedge', '53° Wedge',
  '54° Wedge', '55° Wedge', '56° Wedge', '57° Wedge', '58° Wedge',
  '59° Wedge', '60° Wedge', '61° Wedge', '62° Wedge', '64° Wedge',
  // Named wedges (for users who label by name)
  'Gap Wedge', 'Sand Wedge', 'Lob Wedge',
  // Other
  'Chipper', 'Putter',
]

const TYPE_TO_CODE: Record<string, string> = {
  'Driver': 'Driver', 'Mini Driver': 'Mini',
  '2 Wood': '2W', '3 Wood': '3W', '4 Wood': '4W', '5 Wood': '5W', '7 Wood': '7W', '9 Wood': '9W',
  '1 Hybrid': '1H', '2 Hybrid': '2H', '3 Hybrid': '3H', '4 Hybrid': '4H',
  '5 Hybrid': '5H', '6 Hybrid': '6H', '7 Hybrid': '7H',
  'Driving Iron': 'DI',
  '1 Iron': '1I', '2 Iron': '2I', '3 Iron': '3I', '4 Iron': '4I',
  '5 Iron': '5I', '6 Iron': '6I', '7 Iron': '7I', '8 Iron': '8I', '9 Iron': '9I',
  'Pitching Wedge': 'PW',
  '44° Wedge': '44°', '45° Wedge': '45°', '46° Wedge': '46°', '47° Wedge': '47°', '48° Wedge': '48°',
  '49° Wedge': '49°', '50° Wedge': '50°', '51° Wedge': '51°', '52° Wedge': '52°', '53° Wedge': '53°',
  '54° Wedge': '54°', '55° Wedge': '55°', '56° Wedge': '56°', '57° Wedge': '57°', '58° Wedge': '58°',
  '59° Wedge': '59°', '60° Wedge': '60°', '61° Wedge': '61°', '62° Wedge': '62°', '64° Wedge': '64°',
  'Gap Wedge': 'GW', 'Sand Wedge': 'SW', 'Lob Wedge': 'LW',
  'Chipper': 'Chip', 'Putter': 'Putter',
}

function confidenceInfo(shots: number, stdDev: number | null) {
  if (shots < 5 || stdDev === null) return { label: 'Building…', color: '#9CA3AF', pct: 0.2 }
  if (stdDev < 8)  return { label: 'High',   color: '#22C55E', pct: 0.92 }
  if (stdDev < 15) return { label: 'Medium', color: '#F59E0B', pct: 0.58 }
  return               { label: 'Low',    color: '#EF4444', pct: 0.28 }
}

export default function ClubsPage() {
  const [bagClubs,  setBagClubs]  = useState<any[]>([])
  const [profiles,  setProfiles]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [adding,    setAdding]    = useState(false)
  const [brand,     setBrand]     = useState('')
  const [clubType,  setClubType]  = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [saving,    setSaving]    = useState(false)
  const [removing,  setRemoving]  = useState<string | null>(null)
  const [dupError,  setDupError]  = useState('')
  const brandRef = useRef<HTMLDivElement>(null)

  function load() {
    Promise.all([
      supabase.from('user_bag').select('*').order('created_at', { ascending: true }),
      fetchClubProfiles(),
    ]).then(([{ data: bag }, profs]) => {
      setBagClubs(bag || [])
      setProfiles(profs)
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])
  const live = useRealtime(['user_bag', 'club_profiles'], load)

  useEffect(() => {
    if (!brand.trim()) { setSuggestions([]); return }
    const q = brand.toLowerCase()
    setSuggestions(BRANDS.filter(b => b.toLowerCase().includes(q)).slice(0, 6))
  }, [brand])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setSuggestions([])
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function addClub() {
    if (!brand.trim() || !clubType) return
    if (bagClubs.some(c => c.club_type === clubType)) {
      setDupError(`${clubType} is already in your bag`)
      return
    }
    setDupError('')
    setSaving(true)
    const { data } = await supabase
      .from('user_bag')
      .insert({ brand: brand.trim(), club_type: clubType, display_name: `${brand.trim()} ${clubType}` })
      .select()
      .single()
    if (data) {
      setBagClubs(prev => [...prev, data])
      track('club_added', { brand: brand.trim(), club_type: clubType })
    }
    setBrand('')
    setClubType('')
    setAdding(false)
    setSaving(false)
  }

  async function removeClub(id: string) {
    setRemoving(id)
    const club = bagClubs.find(c => c.id === id)
    await supabase.from('user_bag').delete().eq('id', id)
    setBagClubs(prev => prev.filter(c => c.id !== id))
    track('club_removed', { club_type: club?.club_type })
    setRemoving(null)
  }

  function getProfile(type: string) {
    const code = TYPE_TO_CODE[type]
    if (!code) return null
    return profiles.find(p =>
      p.club_name?.toLowerCase() === code.toLowerCase() ||
      p.club_name?.toLowerCase() === type.toLowerCase()
    ) ?? null
  }

  const alreadyInBag = new Set(bagClubs.map(c => c.club_type))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading clubs…</div>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-black text-[#111] tracking-tight">My Bag</h1>
            
          </div>
          <p className="text-[13.5px] text-gray-400 mt-0.5">
            {bagClubs.length > 0
              ? `${bagClubs.length} club${bagClubs.length !== 1 ? 's' : ''} · confidence builds as you log shots`
              : 'Add your clubs to start tracking performance data'}
          </p>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-[13px] font-bold hover:bg-[#A07828] transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Club
        </button>
      </div>

      {/* Add club form */}
      {adding && (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] shadow-sm p-5 mb-4">
          <div className="text-[13.5px] font-bold text-[#111] mb-4">Add a club to your bag</div>
          <div className="flex flex-col sm:flex-row gap-3 items-end">

            {/* Brand autocomplete */}
            <div ref={brandRef} className="relative flex-1">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Brand</label>
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. TaylorMade"
                autoComplete="off"
                className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[14px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => { setBrand(s); setSuggestions([]) }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-[#111] hover:bg-[#FEF3E8] hover:text-[#C9A84C] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Club type */}
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Club Type</label>
              <select
                value={clubType}
                onChange={e => { setClubType(e.target.value); setDupError('') }}
                className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[14px] text-[#111] focus:outline-none focus:border-[#C9A84C] transition cursor-pointer"
              >
                <option value="">Select type…</option>
                {CLUB_TYPES.map(t => (
                  <option key={t} value={t} disabled={alreadyInBag.has(t)}>
                    {t}{alreadyInBag.has(t) ? ' (already in bag)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={addClub}
              disabled={!brand.trim() || !clubType || saving}
              className="w-full sm:w-auto px-6 py-3 bg-[#C9A84C] text-white rounded-xl text-[13.5px] font-bold hover:bg-[#A07828] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding…' : 'Add to Bag'}
            </button>
          </div>
          {dupError && (
            <p className="mt-3 text-[12.5px] text-red-500 font-medium">{dupError}</p>
          )}
        </div>
      )}

      {/* Empty state */}
      {bagClubs.length === 0 && !adding ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="text-5xl mb-4">🏌️</div>
          <p className="text-[14px] font-semibold text-[#111] mb-1">Your bag is empty</p>
          <p className="text-[13px] text-gray-400 mb-6">
            Add your clubs to track average distance, accuracy, and shot patterns.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-[13.5px] font-bold hover:bg-[#A07828] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Your First Club
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bagClubs.map((club: any) => {
            const profile = getProfile(club.club_type)
            const stdDev  = profile ? (profile.std_dev ?? profile.yards_std_dev ?? null) : null
            const conf    = profile ? confidenceInfo(profile.shot_count, stdDev) : null

            return (
              <div
                key={club.id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all ${
                  removing === club.id ? 'opacity-40 scale-[0.99]' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4 md:gap-5">

                  {/* Club info */}
                  <div className="w-20 sm:w-28 md:w-36 shrink-0">
                    <div className="text-[16px] font-black text-[#111] leading-tight">{club.club_type}</div>
                    <div className="text-[11.5px] text-[#C9A84C] font-semibold mt-0.5">{club.brand}</div>
                  </div>

                  {/* Avg yards */}
                  <div className="text-center shrink-0 w-14 md:w-20">
                    {profile ? (
                      <>
                        <div className="text-[32px] md:text-[36px] font-black text-[#C9A84C] leading-none">
                          {Math.round(profile.avg_yards)}
                        </div>
                        <div className="text-[9px] md:text-[10px] font-bold text-gray-400 tracking-wider mt-0.5">AVG YDS</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[28px] font-black text-gray-200 leading-none">—</div>
                        <div className="text-[9px] font-bold text-gray-300 tracking-wider mt-0.5">AVG YDS</div>
                      </>
                    )}
                  </div>

                  {/* Confidence bar */}
                  <div className="flex-1 min-w-0">
                    {conf ? (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[12px] font-bold" style={{ color: conf.color }}>
                            {conf.label} Confidence
                          </span>
                          {stdDev !== null && profile.shot_count >= 5 && (
                            <span className="text-[11px] text-gray-400 hidden sm:block">
                              ±{Math.round(stdDev)}y spread
                            </span>
                          )}
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${conf.pct * 100}%`, background: conf.color }}
                          />
                        </div>
                        <div className="text-[10.5px] text-gray-400 mt-1">{profile.shot_count} shots logged</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[12px] font-bold text-gray-300 mb-1.5">No data yet</div>
                        <div className="h-2 bg-gray-100 rounded-full" />
                        <div className="text-[10.5px] text-gray-400 mt-1">Log shots in the app to build your profile</div>
                      </>
                    )}
                  </div>

                  {/* Miss pattern */}
                  <div className="hidden sm:block w-24 text-right shrink-0 space-y-0.5">
                    {profile ? (
                      <>
                        {profile.fade_pct > 25 && (
                          <div className="text-[11.5px] text-blue-500 font-medium">{Math.round(profile.fade_pct)}% fade</div>
                        )}
                        {profile.draw_pct > 25 && (
                          <div className="text-[11.5px] text-orange-500 font-medium">{Math.round(profile.draw_pct)}% draw</div>
                        )}
                        {profile.shot_count >= 5 && (
                          <div className="text-[11px] text-gray-400">Play {Math.round(profile.avg_yards)}y</div>
                        )}
                      </>
                    ) : null}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeClub(club.id)}
                    disabled={removing === club.id}
                    className="p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                    aria-label="Remove club"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
