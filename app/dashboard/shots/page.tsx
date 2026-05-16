'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ProGate from '@/components/ProGate'

export default function ShotShapesPage() {
  const [shapes, setShapes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('shot_shapes')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(500)
      .then(({ data }) => { setShapes(data || []); setLoading(false) })
  }, [])

  // Group by club
  const byClub: Record<string, any[]> = {}
  shapes.forEach(s => { if (s.club) { byClub[s.club] = byClub[s.club] || []; byClub[s.club].push(s) } })

  const shapeColors: Record<string, string> = {
    Straight: '#00E578', Fade: '#60A5FA', Draw: '#F97316',
    Slice: '#EF4444', Hook: '#A855F7', Push: '#FBBF24', Pull: '#F472B6'
  }

  if (loading) return <div className="p-8 text-gray-500">Loading shot shapes...</div>

  return (
    <ProGate feature="Shot Shapes" description="Your ball flight tendencies per club — identify your fade, draw, or slice patterns and fix them with data.">
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#111]">Shot Shapes</h1>
        <p className="text-gray-500 mt-1">Your ball flight tendencies per club — logged from every round</p>
      </div>

      {/* Overall shape summary */}
      <div className="card p-6 mb-6">
        <div className="stat-label mb-4">OVERALL TENDENCY ({shapes.length} shots)</div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(
            shapes.reduce((acc: Record<string, number>, s) => {
              if (s.shape) acc[s.shape] = (acc[s.shape] || 0) + 1
              return acc
            }, {})
          ).sort((a, b) => b[1] - a[1]).map(([shape, count]) => (
            <div key={shape} className="flex items-center gap-2 px-4 py-2 rounded-full border"
              style={{ borderColor: `${shapeColors[shape] || '#666'}40`, background: `${shapeColors[shape] || '#666'}15` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: shapeColors[shape] || '#666' }} />
              <span className="text-sm font-bold text-[#111]">{shape}</span>
              <span className="text-xs font-black" style={{ color: shapeColors[shape] || '#666' }}>
                {Math.round((count / shapes.length) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per club breakdown */}
      {Object.keys(byClub).length === 0 ? (
        <div className="card p-16 text-center text-gray-600">
          <div className="text-5xl mb-4">🏌️</div>
          No shot shape data yet. Log shot shapes in the app when tracking shots.
        </div>
      ) : Object.entries(byClub).sort((a, b) => {
        const order = ['Driver','3W','5W','4H','4i','5i','6i','7i','8i','9i','PW','GW','SW','LW','Putter']
        return order.indexOf(a[0]) - order.indexOf(b[0])
      }).map(([club, shots]) => {
        const shapeCounts = shots.reduce((acc: Record<string, number>, s) => {
          if (s.shape) acc[s.shape] = (acc[s.shape] || 0) + 1
          return acc
        }, {})
        const topShape = Object.entries(shapeCounts).sort((a, b) => b[1] - a[1])[0]

        return (
          <div key={club} className="card p-5 mb-3">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-xl font-black text-[#111] w-16">{club}</div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(shapeCounts).sort((a,b) => b[1]-a[1]).map(([shape, count]) => (
                    <div key={shape} className="flex items-center gap-1.5 text-xs font-bold"
                      style={{ color: shapeColors[shape] || '#666' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: shapeColors[shape] || '#666' }} />
                      {shape} {Math.round((count/shots.length)*100)}%
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{shots.length} shots</div>
                {topShape && (
                  <div className="text-sm font-bold" style={{ color: shapeColors[topShape[0]] || '#666' }}>
                    {topShape[0]} tendency
                  </div>
                )}
              </div>
            </div>
            {/* Bar chart */}
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
              {Object.entries(shapeCounts).sort((a,b) => b[1]-a[1]).map(([shape, count]) => (
                <div key={shape}
                  style={{ width:`${(count/shots.length)*100}%`, background: shapeColors[shape] || '#666' }}
                  title={`${shape}: ${count}`} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
    </ProGate>
  )
}
