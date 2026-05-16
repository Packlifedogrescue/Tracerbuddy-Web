'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { fetchRoundWithShots } from '@/lib/supabase'
import { format } from 'date-fns'
import { ArrowLeft, CloudSun, Flag } from 'lucide-react'

const ShotMap = dynamic(() => import('@/components/ShotMap'), { ssr: false })

const PALETTE = ['#2D6A4F','#6B9E5E','#4A7C59','#C9A84C','#8B7355','#5B8A65','#A07340','#607D4A','#3D7A6E','#7A6030']
function courseColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function ScoreBadge({ score, par }: { score: number | null; par: number }) {
  if (score == null) return <span className="text-gray-300 font-bold text-[13px]">—</span>
  const diff = score - par
  if (diff <= -2) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#C9A84C] text-white text-[12px] font-black ring-2 ring-[#C9A84C]/30">{score}</span>
  if (diff === -1) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#22A06B] text-white text-[12px] font-black ring-2 ring-[#22A06B]/30">{score}</span>
  if (diff === 0)  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-200 text-[#111] text-[12px] font-black">{score}</span>
  if (diff === 1)  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-orange-300 text-orange-500 text-[12px] font-black">{score}</span>
  if (diff === 2)  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 border-2 border-red-400 text-red-500 text-[12px] font-black">{score}</span>
  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-[12px] font-black">{score}</span>
}

export default function RoundDetailPage() {
  const { id }    = useParams()
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchRoundWithShots(id as string).then(d => { setData(d); setLoading(false) })
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-10 h-10 rounded-full border-2 border-[#F0EAE0] border-t-[#C9A84C] animate-spin" />
    </div>
  )

  const { round, shots, holeStats } = data
  if (!round) return <div className="p-8 text-gray-500">Round not found</div>

  const par        = holeStats.reduce((a: number, h: any) => a + (h.par || 4), 0)
  const scoreDiff  = round.total_score != null ? round.total_score - par : null
  const color      = courseColor(round.course_name || 'Course')
  const front      = holeStats.filter((h: any) => h.hole <= 9)
  const back       = holeStats.filter((h: any) => h.hole > 9)
  const frontPar   = front.reduce((a: number, h: any) => a + (h.par || 4), 0)
  const backPar    = back.reduce((a: number, h: any) => a + (h.par || 4), 0)
  const frontScore = front.reduce((a: number, h: any) => a + (h.score || 0), 0)
  const backScore  = back.reduce((a: number, h: any) => a + (h.score || 0), 0)

  return (
    <div className="p-5 md:p-6 max-w-5xl space-y-4 pb-10">

      <Link href="/dashboard/rounds" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-400 hover:text-[#111] transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All Rounds
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl shrink-0" style={{ background: color }} />
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-black text-[#111] leading-tight truncate">{round.course_name || 'Unknown Course'}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12px] text-gray-400">
              <span>{format(new Date(round.created_at), 'EEEE, MMMM d yyyy')}</span>
              {round.round_mode && round.round_mode !== 'Stroke Play' && (
                <span className="bg-[#F5EFE0] text-[#C9A84C] px-2 py-0.5 rounded-full font-semibold text-[11px]">{round.round_mode}</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[52px] font-black text-[#111] leading-none">{round.total_score ?? '—'}</div>
            {scoreDiff != null && (
              <div className={`text-[14px] font-black mt-0.5 ${scoreDiff < 0 ? 'text-[#22A06B]' : scoreDiff === 0 ? 'text-gray-400' : 'text-red-400'}`}>
                {scoreDiff === 0 ? 'E' : scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'GIR',       value: `${round.gir_count ?? 0}/18` },
          { label: 'Fairways',  value: `${round.fairways_hit ?? 0}/14` },
          { label: 'Putts',     value: round.putts ?? 0 },
          { label: 'Shots',     value: round.shot_count ?? 0 },
          { label: 'Penalties', value: round.total_penalties ?? 0 },
          { label: 'Diff',      value: round.handicap_differential?.toFixed(1) ?? '—' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{s.label}</div>
            <div className="text-[20px] font-black text-[#111]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Shot map */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Shot Map</div>
          {shots.length > 0 ? (
            <ShotMap shots={shots} />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <Flag className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-[13px] text-gray-400">No GPS shots logged this round</p>
            </div>
          )}
        </div>

        {/* Scorecard */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#F0EAE0] shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Scorecard</div>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#F0EAE0]">
                  {['Hole','Par','Score','GIR','Putts'].map(h => (
                    <th key={h} className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400 first:pl-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holeStats.map((h: any, idx: number) => (
                  <tr key={h.hole} className={`border-b ${h.hole === 9 ? 'border-[#E8E0D0]' : 'border-[#F8F4EE]'} ${idx % 2 !== 0 ? 'bg-[#FAFAF8]' : ''}`}>
                    <td className="py-2 pl-3 text-center text-[12px] font-bold text-gray-500 w-10">{h.hole}</td>
                    <td className="py-2 text-center text-[12px] text-gray-400">{h.par}</td>
                    <td className="py-2 text-center">
                      <div className="flex justify-center">
                        <ScoreBadge score={h.score} par={h.par || 4} />
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      <div className={`w-4 h-4 rounded-full mx-auto ${h.gir ? 'bg-[#22A06B]' : 'bg-[#F0EAE0]'}`} />
                    </td>
                    <td className="py-2 text-center text-[12px] text-gray-500">{h.putts || '—'}</td>
                  </tr>
                ))}
              </tbody>
              {front.length > 0 && back.length > 0 && (
                <tfoot>
                  <tr className="bg-[#F8F4EE] border-t border-[#E8E0D0]">
                    <td className="py-2 pl-3 text-[10px] font-black text-[#666] uppercase">Out</td>
                    <td className="py-2 text-center text-[11px] font-black text-gray-400">{frontPar}</td>
                    <td className="py-2 text-center text-[13px] font-black text-[#111]">{frontScore || '—'}</td>
                    <td className="py-2 text-center text-[11px] font-bold text-[#22A06B]">{front.filter((h: any) => h.gir).length}</td>
                    <td className="py-2 text-center text-[11px] text-gray-400">{front.reduce((a: number, h: any) => a + (h.putts || 0), 0) || '—'}</td>
                  </tr>
                  <tr className="bg-[#F8F4EE]">
                    <td className="py-2 pl-3 text-[10px] font-black text-[#666] uppercase">In</td>
                    <td className="py-2 text-center text-[11px] font-black text-gray-400">{backPar}</td>
                    <td className="py-2 text-center text-[13px] font-black text-[#111]">{backScore || '—'}</td>
                    <td className="py-2 text-center text-[11px] font-bold text-[#22A06B]">{back.filter((h: any) => h.gir).length}</td>
                    <td className="py-2 text-center text-[11px] text-gray-400">{back.reduce((a: number, h: any) => a + (h.putts || 0), 0) || '—'}</td>
                  </tr>
                  <tr className="bg-[#1A1A1A]">
                    <td className="py-3 pl-3 text-[10px] font-black text-white uppercase">Total</td>
                    <td className="py-3 text-center text-[11px] font-black text-gray-500">{par}</td>
                    <td className="py-3 text-center">
                      <span className={`text-[15px] font-black ${scoreDiff != null && scoreDiff <= 0 ? 'text-[#22A06B]' : 'text-[#C9A84C]'}`}>{round.total_score}</span>
                    </td>
                    <td className="py-3 text-center text-[11px] font-bold text-[#22A06B]">{round.gir_count}</td>
                    <td className="py-3 text-center text-[11px] font-bold text-gray-400">{round.putts}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#F0EAE0] flex flex-wrap gap-x-4 gap-y-1.5 shrink-0">
            {[
              { label: 'Eagle+', cls: 'bg-[#C9A84C] text-white' },
              { label: 'Birdie', cls: 'bg-[#22A06B] text-white' },
              { label: 'Par',    cls: 'border-2 border-gray-200' },
              { label: 'Bogey',  cls: 'border-2 border-orange-300' },
              { label: 'Double+',cls: 'bg-red-500 text-white' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded-full ${l.cls}`} />
                <span className="text-[10px] text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {round.weather_temp_f && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CloudSun className="w-4 h-4 text-[#C9A84C]" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Playing Conditions</div>
          </div>
          <div className="flex gap-8">
            {[
              { label: 'Temp',       value: `${round.weather_temp_f}°F` },
              { label: 'Wind',       value: `${round.weather_wind_mph} mph` },
              { label: 'Conditions', value: round.weather_condition || '—' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{s.label}</div>
                <div className="text-[18px] font-black text-[#111]">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
