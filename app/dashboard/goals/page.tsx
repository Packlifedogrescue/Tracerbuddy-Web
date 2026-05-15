'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchUserProfile } from '@/lib/supabase'
import { Target, Brain, TrendingDown } from 'lucide-react'

export default function GoalsPage() {
  const [goal, setGoal]       = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [target, setTarget]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('goal_settings').select('*').single(),
      fetchUserProfile(),
    ]).then(([g, p]) => {
      setGoal(g.data)
      setProfile(p)
      setTarget(g.data?.target_handicap?.toString() ?? '')
      setLoading(false)
    })
  }, [])

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('goal_settings').upsert({ target_handicap: parseFloat(target) })
    setSaving(false)
  }

  const current   = profile?.handicap_index ?? 0
  const targetNum = parseFloat(target) || 0
  const needed    = Math.max(0, current - targetNum)
  const progress  = targetNum < current && current > 0
    ? Math.min(100, Math.round(((current - targetNum) / current) * 100))
    : 0

  const milestones = targetNum > 0 && current > 0 ? [
    { label: 'Start',  value: current.toFixed(1),                                       done: true  },
    { label: 'Half',   value: ((current + targetNum) / 2).toFixed(1),                   done: current <= (current + targetNum) / 2 },
    { label: 'Target', value: targetNum.toFixed(1),                                     done: current <= targetNum },
  ] : []

  if (loading) return <div className="p-8 text-gray-400">Loading goals...</div>

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#111]">Goals</h1>
        <p className="text-gray-500 text-sm mt-0.5">Set your target handicap and track your path there</p>
      </div>

      {/* Current vs Target */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">CURRENT</div>
            <div className="text-5xl font-black text-[#111] leading-none">{current.toFixed(1)}</div>
          </div>
          <div className="flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-gray-300" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">TARGET</div>
            <div className="text-5xl font-black text-[#C9A84C] leading-none">{targetNum || '?'}</div>
          </div>
        </div>

        {targetNum > 0 && current > 0 && (
          <>
            <div className="h-3 bg-[#F8F4EE] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-[#C9A84C] to-[#22A06B] rounded-full transition-all duration-700"
                style={{ width: `${100 - progress}%` }}
              />
            </div>
            <div className="text-sm text-gray-500 text-center">{needed.toFixed(1)} strokes to go</div>
          </>
        )}
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">MILESTONES</div>
          <div className="flex items-center gap-0">
            {milestones.map((m, i) => (
              <div key={m.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                    m.done ? 'bg-[#22A06B] border-[#22A06B] text-white' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {m.value}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{m.label}</div>
                </div>
                {i < milestones.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-100 mb-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Set goal */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">SET YOUR TARGET HANDICAP</div>
        <form onSubmit={saveGoal} className="flex gap-3">
          <input
            type="number"
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="e.g. 10.0"
            step="0.1"
            min="0"
            max="54"
            className="flex-1 bg-[#F8F4EE] border border-gray-200 rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] text-xl font-black"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-[#C9A84C] text-white font-black px-6 py-3 rounded-xl hover:bg-[#b8943e] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* AI coaching plan */}
      {goal?.ai_coaching_plan ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-[#F8F4EE] flex items-center justify-center">
              <Brain className="w-4 h-4 text-[#C9A84C]" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9A84C]">YOUR AI COACHING PLAN</div>
          </div>
          <p className="text-[#111] text-sm leading-relaxed">{goal.ai_coaching_plan}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F8F4EE] flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-[#C9A84C]" />
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your AI coaching plan will appear here after you complete a round with a coach card analysis in the app.
          </p>
        </div>
      )}
    </div>
  )
}
