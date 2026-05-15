'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchUserProfile } from '@/lib/supabase'

export default function GoalsPage() {
  const [goal, setGoal]         = useState<any>(null)
  const [profile, setProfile]   = useState<any>(null)
  const [target, setTarget]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('goal_settings').select('*').single(),
      fetchUserProfile()
    ]).then(([g, p]) => {
      setGoal(g.data); setProfile(p)
      setTarget(g.data?.target_handicap?.toString() ?? '')
      setLoading(false)
    })
  }, [])

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await supabase.from('goal_settings').upsert({ target_handicap: parseFloat(target) })
    setSaving(false)
  }

  const current    = profile?.handicap_index ?? 0
  const targetNum  = parseFloat(target) || 0
  const needed     = Math.max(0, current - targetNum)
  const progress   = targetNum < current ? Math.min(100, Math.round(((current - targetNum) / current) * 100)) : 0

  if (loading) return <div className="p-8 text-gray-500">Loading goals...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Goals</h1>
        <p className="text-gray-500 mt-1">Set your target handicap and track your path there</p>
      </div>

      {/* Current vs target */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <div className="stat-label mb-2">CURRENT</div>
            <div className="text-5xl font-black text-white">{current.toFixed(1)}</div>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-3xl text-gray-600">→</div>
          </div>
          <div>
            <div className="stat-label mb-2">TARGET</div>
            <div className="text-5xl font-black text-[#FFD700]">{targetNum || '?'}</div>
          </div>
        </div>

        {targetNum > 0 && current > 0 && (
          <>
            <div className="h-3 bg-[#1F1F1F] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#00E578] rounded-full transition-all duration-500"
                style={{ width: `${100 - progress}%` }} />
            </div>
            <div className="text-sm text-gray-500 text-center">
              {needed.toFixed(1)} strokes to go
            </div>
          </>
        )}
      </div>

      {/* Set goal */}
      <div className="card p-6 mb-6">
        <div className="stat-label mb-4">SET YOUR TARGET HANDICAP</div>
        <form onSubmit={saveGoal} className="flex gap-3">
          <input
            type="number" value={target} onChange={e => setTarget(e.target.value)}
            placeholder="e.g. 10.0" step="0.1" min="0" max="54"
            className="flex-1 bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/40 text-xl font-black"
          />
          <button type="submit" disabled={saving}
            className="bg-[#FFD700] text-black font-black px-6 py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* AI coaching plan */}
      {goal?.ai_coaching_plan ? (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🧠</span>
            <div className="stat-label text-[#FFD700]">YOUR AI COACHING PLAN</div>
          </div>
          <p className="text-white leading-relaxed">{goal.ai_coaching_plan}</p>
        </div>
      ) : (
        <div className="card p-6 text-center text-gray-600">
          <div className="text-4xl mb-3">🧠</div>
          <p>Your AI coaching plan will appear here after you complete a round with a coach card analysis in the app.</p>
        </div>
      )}
    </div>
  )
}
