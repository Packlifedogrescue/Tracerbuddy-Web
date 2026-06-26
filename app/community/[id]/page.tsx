'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Share2, Trophy, Lightbulb, HelpCircle, MapPin, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Post = {
  id: string; user_id: string; type: string; title: string; content: string
  course_name?: string; round_score?: number; round_par?: number
  round_gir?: number; round_fairways?: number; round_putts?: number
  created_at: string; author_name: string
  reactions: Record<string, number>; user_reaction?: string
}

type Comment = { id: string; author_name: string; content: string; created_at: string }

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  round_recap:   { label: 'Round Recap',   icon: Trophy,     color: 'bg-green-100 text-green-700' },
  tip:           { label: 'Tip',           icon: Lightbulb,  color: 'bg-yellow-100 text-yellow-700' },
  question:      { label: 'Question',      icon: HelpCircle, color: 'bg-blue-100 text-blue-700' },
  course_review: { label: 'Course Review', icon: MapPin,     color: 'bg-purple-100 text-purple-700' },
}

const REACTIONS = ['🔥', '👍', '🏌️'] as const

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function scoreDiff(score: number, par: number) {
  const d = score - par
  if (d === 0) return { label: 'Even', color: 'text-gray-600' }
  if (d < 0)   return { label: `${d}`, color: 'text-green-600' }
  return { label: `+${d}`, color: 'text-red-500' }
}

export default function PostPage({ params }: { params: { id: string } }) {
  const [post, setPost]         = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [userId, setUserId]     = useState<string | null>(null)
  const [authorName, setAuthorName] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) {
        supabase.from('user_profiles').select('display_name').eq('user_id', uid).single()
          .then(({ data: p }) => setAuthorName(p?.display_name ?? 'Golfer'))
      }
    })
  }, [])

  useEffect(() => {
    async function load() {
      const [{ data: postData }, { data: commentData }] = await Promise.all([
        supabase.from('community_posts').select(`
          id, user_id, type, title, content, course_name, round_score,
          round_par, round_gir, round_fairways, round_putts, created_at, author_name,
          community_reactions(emoji, user_id)
        `).eq('id', params.id).single(),
        supabase.from('community_comments')
          .select('id, author_name, content, created_at')
          .eq('post_id', params.id)
          .order('created_at', { ascending: true }),
      ])

      if (postData) {
        const reactionCounts: Record<string, number> = {}
        let userReaction: string | undefined
        for (const r of (postData as any).community_reactions ?? []) {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1
          if (r.user_id === userId) userReaction = r.emoji
        }
        setPost({ ...postData, reactions: reactionCounts, user_reaction: userReaction } as Post)
      }
      setComments(commentData ?? [])
      setLoading(false)
    }
    load()
  }, [params.id, userId])

  async function handleReaction(emoji: string) {
    if (!post) return
    if (!userId) { window.location.href = '/auth/login'; return }

    if (post.user_reaction === emoji) {
      await supabase.from('community_reactions').delete().eq('post_id', post.id).eq('user_id', userId).eq('emoji', emoji)
      const next = { ...post.reactions }
      next[emoji] = Math.max(0, (next[emoji] ?? 1) - 1)
      if (!next[emoji]) delete next[emoji]
      setPost({ ...post, reactions: next, user_reaction: undefined })
    } else {
      if (post.user_reaction) {
        await supabase.from('community_reactions').delete().eq('post_id', post.id).eq('user_id', userId)
      }
      await supabase.from('community_reactions').insert({ post_id: post.id, user_id: userId, emoji })
      const next = { ...post.reactions }
      if (post.user_reaction) next[post.user_reaction] = Math.max(0, (next[post.user_reaction] ?? 1) - 1)
      next[emoji] = (next[emoji] ?? 0) + 1
      setPost({ ...post, reactions: next, user_reaction: emoji })
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !userId) return
    setSubmitting(true)
    const { data, error } = await supabase.from('community_comments')
      .insert({ post_id: params.id, user_id: userId, content: newComment.trim(), author_name: authorName })
      .select().single()
    if (!error && data) {
      setComments(prev => [...prev, data as Comment])
      setNewComment('')
    }
    setSubmitting(false)
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-6 h-6 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  if (!post) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-[14px] text-gray-400">Post not found.</p>
      <Link href="/community" className="text-[#DF9905] font-semibold text-[13px] mt-3 block">← Back to Community</Link>
    </div>
  )

  const meta = TYPE_META[post.type] ?? TYPE_META.tip
  const Icon = meta.icon

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/community" className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#111] mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Community
      </Link>

      {/* Post */}
      <div className="bg-white rounded-2xl border border-black/[0.05] p-6 mb-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#0D2818] flex items-center justify-center text-white text-[14px] font-bold shrink-0">
            {post.author_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-[#111]">{post.author_name}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                <Icon className="w-2.5 h-2.5" />
                {meta.label}
              </span>
            </div>
            <span className="text-[12px] text-gray-400">{timeAgo(post.created_at)}</span>
          </div>
        </div>

        <h1 className="text-[20px] font-bold text-[#111] leading-snug mb-3">{post.title}</h1>
        <p className="text-[14px] text-[#444] leading-[1.7] whitespace-pre-wrap">{post.content}</p>

        {/* Round stats */}
        {post.type === 'round_recap' && post.round_score && (
          <div className="mt-4 bg-[#F5EFE0] rounded-xl p-4 flex flex-wrap gap-4">
            <div className="text-center">
              <div className="text-[28px] font-bold text-[#111] leading-none">{post.round_score}</div>
              {post.round_par && (
                <div className={`text-[12px] font-semibold mt-0.5 ${scoreDiff(post.round_score, post.round_par).color}`}>
                  {scoreDiff(post.round_score, post.round_par).label}
                </div>
              )}
              <div className="text-[10px] text-gray-400 mt-0.5">Score</div>
            </div>
            {post.course_name && (
              <div className="border-l border-black/10 pl-4">
                <div className="text-[10px] text-gray-400">Course</div>
                <div className="text-[13px] font-semibold text-[#111]">{post.course_name}</div>
              </div>
            )}
            {post.round_gir !== undefined && post.round_gir !== null && (
              <div className="border-l border-black/10 pl-4">
                <div className="text-[10px] text-gray-400">GIR</div>
                <div className="text-[13px] font-semibold text-[#111]">{post.round_gir}%</div>
              </div>
            )}
            {post.round_fairways !== undefined && post.round_fairways !== null && (
              <div className="border-l border-black/10 pl-4">
                <div className="text-[10px] text-gray-400">Fairways</div>
                <div className="text-[13px] font-semibold text-[#111]">{post.round_fairways}%</div>
              </div>
            )}
            {post.round_putts !== undefined && post.round_putts !== null && (
              <div className="border-l border-black/10 pl-4">
                <div className="text-[10px] text-gray-400">Putts/hole</div>
                <div className="text-[13px] font-semibold text-[#111]">{post.round_putts}</div>
              </div>
            )}
          </div>
        )}

        {/* Reactions + share */}
        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-gray-50 flex-wrap">
          {REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-1 text-[13px] px-3 py-1.5 rounded-xl transition-colors ${
                post.user_reaction === emoji
                  ? 'bg-[#FEF3E8] text-[#E87830] font-semibold'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <span>{emoji}</span>
              {(post.reactions[emoji] ?? 0) > 0 && <span className="font-semibold">{post.reactions[emoji]}</span>}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[12px] text-gray-400">
              <MessageCircle className="w-3.5 h-3.5" />
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-black/[0.05] p-5">
        <h2 className="text-[14px] font-bold text-[#111] mb-4">
          {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}` : 'Comments'}
        </h2>

        {comments.length === 0 && (
          <p className="text-[13px] text-gray-400 mb-4">No comments yet. Be the first!</p>
        )}

        <div className="space-y-4 mb-5">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#0D2818] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {c.author_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-[#111]">{c.author_name}</span>
                  <span className="text-[11px] text-gray-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-[13px] text-[#444] mt-0.5 leading-[1.6]">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comment form */}
        {userId ? (
          <form onSubmit={handleComment} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#0D2818] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-[#F8F5EE] border border-[#E8E2D8] rounded-xl px-3 py-2 text-[13px] text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] transition"
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="w-9 h-9 bg-[#DF9905] rounded-xl flex items-center justify-center hover:bg-[#A07509] transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </form>
        ) : (
          <Link href="/auth/login" className="block text-center text-[13px] font-semibold text-[#DF9905] py-3 border border-[#DF9905]/30 rounded-xl hover:bg-[#FEF3E8] transition-colors">
            Sign in to comment
          </Link>
        )}
      </div>
    </div>
  )
}
