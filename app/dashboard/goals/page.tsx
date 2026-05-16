'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchUserProfile } from '@/lib/supabase'
import { Target, Brain, TrendingDown, Check } from 'lucide-react'

export default function GoalsPage() {
  const [goal,    setGoal]    = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [target,  setTarget]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
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
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const current   = profile?.handicap_index ?? 0
  const targetNum = parseFloat(target) || 0
  const needed    = Math.max(0, current - targetNum)

  // progress = how much of the goal has been covered (0 → 100%)
  // We show how far below "current" you need to get
  const totalDrop    = current > 0 && targetNum < current ? current - targetNum : 0
  const progressPct  = current > 0 && targetNum < current
    ? Math.min(100, Math.round(((current - targetNum) / current) * 100))
    : 0

  const milestones = targetNum > 0 && current > 0 && targetNum < current ? [
    { label: 'Current',  value: current.toFixed(1),                                                done: true  },
    { label: 'Halfway',  value: ((current + targetNum) / 2).toFixed(1),                            done: current <= (current + targetNum) / 2 },
    { label: 'Target',   value: targetNum.toFixed(1),                                              done: current <= targetNum },
  ] : []

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[13px] text-gray-400">Loading goals…</div>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-4 pb-10">
      <div>
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">Goals</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Set your target handicap and track your path there</p>
      </div>

      {/* Current vs Target */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Current</div>
            <div className="text-[52px] font-black text-[#111] leading-none">{current.toFixed(1)}</div>
            <div className="text-[11px] text-gray-400 mt-1">Handicap Index</div>
          </div>
          <div className="flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-gray-300" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Target</div>
            <div className="text-[52px] font-black text-[#C9A84C] leading-none">{targetNum || '?'}</div>
            <div className="text-[11px] text-gray-400 mt-1">Goal</div>
          </div>
        </div>

        {targetNum > 0 && current > 0 && targetNum < current && (
          <>
            <div className="h-3 bg-[#F8F4EE] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-[#C9A84C] to-[#22A06B] rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="text-[11px] text-gray-400">{progressPct}% of goal size set</div>
              <div className="text-[13px] font-bold text-[#111]">{needed.toFixed(1)} strokes to drop</div>
            </div>
          </>
        )}
        {targetNum > 0 && current > 0 && targetNum >= current && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 text-[#22A06B] font-bold text-[14px]">
              <Check className="w-4 h-4" /> You've reached your goal!
            </div>
          </div>
        )}
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">Milestones</div>
          <div className="flex items-center">
            {milestones.map((m, i) => (
              <div key={m.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[12px] border-2 ${
                    m.done
                      ? 'bg-[#22A06B] border-[#22A06B] text-white'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {m.value}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1.5 font-semibold">{m.label}</div>
                </div>
                {i < milestones.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 ${m.done ? 'bg-[#22A06B]/30' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Set goal form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-[13.5px] font-bold text-[#111]">Set Target Handicap</span>
        </div>
        <form onSubmit={saveGoal} className="flex gap-3">
          <input
            type="number"
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="e.g. 10.0"
            step="0.1"
            min="0"
            max="54"
            className="flex-1 bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] text-[22px] font-black transition"
          />
          <button
            type="submit"
            disabled={saving}
            className={`font-black px-6 py-3 rounded-xl transition-colors flex items-center gap-2 ${
              saved ? 'bg-[#22A06B] text-white' : 'bg-[#C9A84C] text-white hover:bg-[#A07828]'
            } disabled:opacity-50`}
          >
            {saving ? 'Saving…' : saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save'}
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
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9A84C]">Your AI Coaching Plan</div>
          </div>
          <p className="text-[13px] text-[#111] leading-relaxed">{goal.ai_coaching_plan}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F8F4EE] flex items-center justify-center mx-auto mb-3">
            <Brain className="w-6 h-6 text-[#C9A84C]" />
          </div>
          <p className="text-[14px] font-semibold text-[#111] mb-1">No coaching plan yet</p>
          <p className="text-[13px] text-gray-400 leading-relaxed max-w-sm mx-auto">
            Your AI coaching plan will appear here after you complete a round with a coach card analysis in the app.
          </p>
        </div>
      )}
    </div>
  )
}
