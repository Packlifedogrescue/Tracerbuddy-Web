'use client'
import { useState, useEffect } from 'react'
import { X, Trophy, Lightbulb, HelpCircle, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Post } from './page'

const TYPES = [
  { value: 'round_recap',   label: 'Round Recap',   icon: Trophy,     desc: 'Share how you played' },
  { value: 'tip',           label: 'Tip',           icon: Lightbulb,  desc: 'Share something useful' },
  { value: 'question',      label: 'Question',      icon: HelpCircle, desc: 'Ask the community' },
  { value: 'course_review', label: 'Course Review', icon: MapPin,     desc: 'Review a course' },
] as const

type Round = { id: string; course_name: string; score: number; course_par: number; played_at: string }

export default function NewPostModal({
  userId, onClose, onPost,
}: {
  userId: string
  onClose: () => void
  onPost: (post: Post) => void
}) {
  const [type, setType]           = useState<string>('round_recap')
  const [title, setTitle]         = useState('')
  const [content, setContent]     = useState('')
  const [selectedRound, setSelectedRound] = useState<Round | null>(null)
  const [rounds, setRounds]       = useState<Round[]>([])
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    supabase.from('user_profiles').select('display_name').eq('user_id', userId).single()
      .then(({ data }) => setAuthorName(data?.display_name ?? 'Golfer'))
    supabase.from('rounds').select('id, course_name, score, course_par, played_at')
      .eq('user_id', userId).order('played_at', { ascending: false }).limit(20)
      .then(({ data }) => setRounds(data ?? []))
  }, [userId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return }
    setSubmitting(true); setError('')

    const payload: any = {
      user_id: userId,
      type,
      title: title.trim(),
      content: content.trim(),
      author_name: authorName,
    }

    if (type === 'round_recap' && selectedRound) {
      payload.round_id      = selectedRound.id
      payload.course_name   = selectedRound.course_name
      payload.round_score   = selectedRound.score
      payload.round_par     = selectedRound.course_par
    }

    const { data, error: err } = await supabase
      .from('community_posts')
      .insert(payload)
      .select()
      .single()

    if (err || !data) { setError(err?.message ?? 'Failed to post'); setSubmitting(false); return }

    onPost({ ...data, comment_count: 0, reactions: {}, user_reaction: undefined })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-bold text-[#111]">New Post</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    type === t.value
                      ? 'border-[#DF9905] bg-[#FEF3E8]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${type === t.value ? 'text-[#DF9905]' : 'text-gray-400'}`} />
                  <div>
                    <div className={`text-[12px] font-semibold ${type === t.value ? 'text-[#DF9905]' : 'text-[#333]'}`}>{t.label}</div>
                    <div className="text-[10px] text-gray-400">{t.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Link a round */}
          {type === 'round_recap' && rounds.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-1.5">LINK A ROUND (OPTIONAL)</label>
              <select
                value={selectedRound?.id ?? ''}
                onChange={e => setSelectedRound(rounds.find(r => r.id === e.target.value) ?? null)}
                className="w-full bg-[#F8F5EE] border border-[#E8E2D8] rounded-xl px-3 py-2.5 text-[13px] text-[#111] focus:outline-none focus:border-[#DF9905]"
              >
                <option value="">No round linked</option>
                {rounds.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.course_name} — {r.score} ({new Date(r.played_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-1.5">TITLE</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                type === 'round_recap'   ? 'Shot my best round ever at Pebble Beach...' :
                type === 'tip'           ? 'The one drill that fixed my putting...' :
                type === 'question'      ? 'How do you handle a 3-wood off the deck?' :
                'Augusta National — everything you need to know'
              }
              maxLength={120}
              required
              className="w-full bg-[#F8F5EE] border border-[#E8E2D8] rounded-xl px-4 py-2.5 text-[13px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] transition"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-1.5">DETAILS</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              placeholder="Share the details..."
              required
              className="w-full bg-[#F8F5EE] border border-[#E8E2D8] rounded-xl px-4 py-2.5 text-[13px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] transition resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-[12px]">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-[13px] font-semibold text-[#555] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 text-[13px] font-bold text-white bg-[#DF9905] rounded-xl hover:bg-[#A07509] transition-colors disabled:opacity-50">
              {submitting ? 'Posting...' : 'Post to Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
