'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PuttingPage() {
  const [data, setData]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('putt_data')
      .select('*, rounds(course_name, created_at)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setData(data || []); setLoading(false) })
  }, [])

  const totalPutts     = data.reduce((a, d) => a + (d.num_putts || 0), 0)
  const threePutts     = data.filter(d => d.num_putts >= 3).length
  const onePutts       = data.filter(d => d.num_putts === 1).length
  const shortMisses    = data.filter(d => d.leave_result?.includes('Short')).length
  const longMisses     = data.filter(d => d.leave_result?.includes('Long')).length
  const leftMisses     = data.filter(d => d.leave_result?.includes('Left')).length
  const rightMisses    = data.filter(d => d.leave_result?.includes('Right')).length

  // Three-putt causes breakdown
  const causeCounts: Record<string, number> = {}
  data.filter(d => d.three_putt_cause).forEach(d => {
    causeCounts[d.three_putt_cause] = (causeCounts[d.three_putt_cause] || 0) + 1
  })
  const topCauses = Object.entries(causeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

  if (loading) return <div className="p-8 text-gray-500">Loading putting stats...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">PuttBuddy</h1>
        <p className="text-gray-500 mt-1">Stop counting putts. Start fixing them.</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'HOLES TRACKED', value: data.length,      color: 'text-white' },
          { label: '3-PUTTS',       value: threePutts,        color: threePutts > 5 ? 'text-red-400' : 'text-white' },
          { label: '1-PUTTS',       value: onePutts,          color: 'text-[#00E578]' },
          { label: 'TOTAL PUTTS',   value: totalPutts,        color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="card p-5 text-center">
            <div className="stat-label mb-2">{s.label}</div>
            <div className={`text-4xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Miss chart */}
        <div className="card p-6">
          <div className="stat-label mb-6">MISS PATTERN</div>
          <div className="flex items-center justify-center">
            {/* Visual green */}
            <div className="relative w-48 h-36">
              <div className="absolute inset-0 rounded-full bg-green-900/40 border border-green-800/30" />
              {/* Center hole */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white" />
              {/* Miss indicators */}
              {shortMisses > 0 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-red-400 text-xs font-black">
                  ↓{shortMisses} short
                </div>
              )}
              {longMisses > 0 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 text-orange-400 text-xs font-black">
                  ↑{longMisses} long
                </div>
              )}
              {leftMisses > 0 && (
                <div className="absolute top-1/2 left-0 -translate-x-8 -translate-y-1/2 text-blue-400 text-xs font-black">
                  ←{leftMisses}
                </div>
              )}
              {rightMisses > 0 && (
                <div className="absolute top-1/2 right-0 translate-x-8 -translate-y-1/2 text-blue-400 text-xs font-black">
                  {rightMisses}→
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-8">
            {[
              { label: 'Short', count: shortMisses, color: '#EF4444' },
              { label: 'Long',  count: longMisses,  color: '#F97316' },
              { label: 'Left',  count: leftMisses,  color: '#60A5FA' },
              { label: 'Right', count: rightMisses, color: '#60A5FA' },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                <span className="text-sm text-gray-400">{m.label}:</span>
                <span className="text-sm font-bold text-white">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Three-putt causes */}
        <div className="card p-6">
          <div className="stat-label mb-4">3-PUTT CAUSES</div>
          {topCauses.length === 0 ? (
            <div className="text-gray-600 text-sm">No 3-putts tracked yet</div>
          ) : topCauses.map(([cause, count]) => (
            <div key={cause} className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white">{cause}</span>
                <span className="text-sm font-bold text-orange-400">x{count}</span>
              </div>
              <div className="h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full"
                  style={{ width: `${(count / threePutts) * 100}%` }}
                />
              </div>
            </div>
          ))}

          {/* Biggest problem */}
          <div className="mt-6 p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
            <div className="stat-label text-red-400 mb-2">YOUR PUTTING ISSUE</div>
            <div className="text-sm text-white font-bold">
              {shortMisses > longMisses + leftMisses + rightMisses
                ? `Leaving putts short (${shortMisses} times). "Never up, never in."`
                : threePutts > 3
                ? `${threePutts} three-putts. Focus on lag putting to within 3 feet.`
                : 'Solid putting! Keep tracking for patterns.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
