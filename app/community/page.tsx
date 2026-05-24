'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageCircle, Share2, Flag, Lightbulb, HelpCircle,
  MapPin, Trophy, Plus, TrendingUp, CheckCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NewPostModal from './NewPostModal'

export type Post = {
  id: string
  user_id: string
  type: 'round_recap' | 'tip' | 'question' | 'course_review'
  title: string
  content: string
  course_name?: string
  round_id?: string
  round_score?: number
  round_par?: number
  round_gir?: number
  round_fairways?: number
  round_putts?: number
  created_at: string
  author_name: string
  comment_count: number
  reactions: Record<string, number>
  user_reaction?: string
}

const TYPE_META = {
  round_recap:   { label: 'Round Recap',   icon: Trophy,     bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-400' },
  tip:           { label: 'Tip',           icon: Lightbulb,  bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-400'   },
  question:      { label: 'Question',      icon: HelpCircle, bg: 'bg-sky-50',      text: 'text-sky-700',      dot: 'bg-sky-400'     },
  course_review: { label: 'Course Review', icon: MapPin,     bg: 'bg-violet-50',   text: 'text-violet-700',   dot: 'bg-violet-400'  },
}

const FILTERS = [
  { value: 'all',           label: 'All' },
  { value: 'round_recap',   label: 'Round Recaps' },
  { value: 'tip',           label: 'Tips' },
  { value: 'question',      label: 'Questions' },
  { value: 'course_review', label: 'Course Reviews' },
] as const

const REACTIONS = ['🔥', '👍', '🏌️'] as const

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function scoreDiff(score: number, par: number) {
  const d = score - par
  if (d === 0) return { label: 'E', color: 'text-gray-500' }
  if (d < 0)   return { label: `${d}`, color: 'text-emerald-600' }
  return { label: `+${d}`, color: 'text-red-500' }
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = ['bg-[#0D2818]','bg-[#1a3a4a]','bg-[#2d1b4e]','bg-[#4a1942]','bg-[#1a4a2e]']
  const idx = name.charCodeAt(0) % colors.length
  const s = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-[13px]'
  return (
    <div className={`${s} ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function CommunityPage() {
  const [posts, setPosts]             = useState<Post[]>([])
  const [filter, setFilter]           = useState<string>('all')
  const [loading, setLoading]         = useState(true)
  const [userId, setUserId]           = useState<string | null>(null)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const [page, setPage]               = useState(0)
  const [hasMore, setHasMore]         = useState(true)
  const [copiedId, setCopiedId]       = useState<string | null>(null)
  const PAGE_SIZE = 15

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    setPosts([]); setPage(0); setHasMore(true)
    loadPosts(0, true)
  }, [filter])

  async function loadPosts(pageNum: number, reset = false) {
    setLoading(true)
    let q = supabase
      .from('community_posts')
      .select(`id, user_id, type, title, content, course_name, round_id,
        round_score, round_par, round_gir, round_fairways, round_putts,
        created_at, author_name,
        community_comments(count),
        community_reactions(emoji, user_id)`)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)
    if (filter !== 'all') q = q.eq('type', filter)
    const { data, error } = await q
    if (error || !data) { setLoading(false); return }
    const formatted: Post[] = data.map((p: any) => {
      const reactionCounts: Record<string, number> = {}
      let userReaction: string | undefined
      for (const r of p.community_reactions ?? []) {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1
        if (r.user_id === userId) userReaction = r.emoji
      }
      return { ...p, comment_count: p.community_comments?.[0]?.count ?? 0, reactions: reactionCounts, user_reaction: userReaction }
    })
    if (reset) setPosts(formatted)
    else setPosts(prev => [...prev, ...formatted])
    setHasMore(data.length === PAGE_SIZE)
    setLoading(false)
  }

  async function handleReaction(postId: string, emoji: string) {
    if (!userId) { window.location.href = '/auth/login'; return }
    const post = posts.find(p => p.id === postId)
    if (!post) return
    if (post.user_reaction === emoji) {
      await supabase.from('community_reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji)
    } else {
      if (post.user_reaction) await supabase.from('community_reactions').delete().eq('post_id', postId).eq('user_id', userId)
      await supabase.from('community_reactions').insert({ post_id: postId, user_id: userId, emoji })
    }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const r = { ...p.reactions }
      if (p.user_reaction === emoji) {
        r[emoji] = Math.max(0, (r[emoji] ?? 1) - 1)
        if (!r[emoji]) delete r[emoji]
        return { ...p, reactions: r, user_reaction: undefined }
      }
      if (p.user_reaction) { r[p.user_reaction] = Math.max(0, (r[p.user_reaction] ?? 1) - 1); if (!r[p.user_reaction]) delete r[p.user_reaction] }
      r[emoji] = (r[emoji] ?? 0) + 1
      return { ...p, reactions: r, user_reaction: emoji }
    }))
  }

  function handleShare(post: Post) {
    const url = `${window.location.origin}/community/${post.id}`
    navigator.clipboard.writeText(url).then(() => { setCopiedId(post.id); setTimeout(() => setCopiedId(null), 2000) })
  }

  return (
    <div>
      {/* Hero banner */}
      <div className="bg-[#0D2818] text-white">
        <div className="max-w-5xl mx-auto px-5 py-10 flex items-center justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.2em] mb-2">TRACERBUDDY</div>
            <h1 className="font-serif text-[32px] md:text-[40px] font-medium tracking-tight leading-tight">Community</h1>
            <p className="text-[14px] text-[#8fad9a] mt-2 max-w-sm">Share rounds, tips, and golf talk with fellow players.</p>
          </div>
          <button
            onClick={() => userId ? setNewPostOpen(true) : window.location.href = '/auth/login'}
            className="shrink-0 flex items-center gap-2 bg-[#DF9905] text-white font-bold text-[13px] px-5 py-3 rounded-xl hover:bg-[#A07509] transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex gap-8">
          {/* Main feed */}
          <div className="flex-1 min-w-0">
            {/* Filter tabs */}
            <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`shrink-0 text-[12.5px] font-semibold px-4 py-2 rounded-xl transition-all ${
                    filter === f.value
                      ? 'bg-[#0D2818] text-white shadow-sm'
                      : 'bg-white text-[#555] hover:bg-[#EDE8DC] border border-black/[0.06]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {posts.map(post => {
                const meta = TYPE_META[post.type]
                const Icon = meta.icon
                return (
                  <article key={post.id} className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-200 group">
                    {/* Top accent line by type */}
                    <div className={`h-0.5 w-full ${meta.dot}`} />
                    <div className="p-5">
                      {/* Author row */}
                      <div className="flex items-center gap-3 mb-3.5">
                        <Avatar name={post.author_name ?? '?'} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-bold text-[#111]">{post.author_name}</span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                              <Icon className="w-2.5 h-2.5" />
                              {meta.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</span>
                        </div>
                      </div>

                      {/* Title + content */}
                      <Link href={`/community/${post.id}`}>
                        <h2 className="text-[16px] font-bold text-[#111] mb-1.5 group-hover:text-[#DF9905] transition-colors leading-snug">{post.title}</h2>
                      </Link>
                      <p className="text-[13.5px] text-[#555] leading-[1.65] line-clamp-2">{post.content}</p>

                      {/* Round stats */}
                      {post.type === 'round_recap' && post.round_score && (
                        <div className="mt-4 inline-flex items-center gap-4 bg-[#F5EFE0] rounded-xl px-4 py-2.5">
                          <div className="text-center">
                            <div className="text-[22px] font-bold text-[#111] leading-none">{post.round_score}</div>
                            {post.round_par && (
                              <div className={`text-[11px] font-bold mt-0.5 ${scoreDiff(post.round_score, post.round_par).color}`}>
                                {scoreDiff(post.round_score, post.round_par).label}
                              </div>
                            )}
                          </div>
                          {post.course_name && (
                            <div className="border-l border-[#D9C9A8] pl-4">
                              <div className="text-[10px] text-[#888] font-medium">COURSE</div>
                              <div className="text-[12.5px] font-bold text-[#111] max-w-[130px] truncate">{post.course_name}</div>
                            </div>
                          )}
                          {post.round_gir !== undefined && post.round_gir !== null && (
                            <div className="border-l border-[#D9C9A8] pl-4">
                              <div className="text-[10px] text-[#888] font-medium">GIR</div>
                              <div className="text-[12.5px] font-bold text-[#111]">{post.round_gir}%</div>
                            </div>
                          )}
                          {post.round_putts !== undefined && post.round_putts !== null && (
                            <div className="border-l border-[#D9C9A8] pl-4">
                              <div className="text-[10px] text-[#888] font-medium">PUTTS/HOLE</div>
                              <div className="text-[12.5px] font-bold text-[#111]">{post.round_putts}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-4 pt-3.5 border-t border-[#F0EBE0]">
                        {REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(post.id, emoji)}
                            className={`flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg transition-all ${
                              post.user_reaction === emoji
                                ? 'bg-[#FEF3E8] text-[#E87830] font-bold ring-1 ring-[#E87830]/20'
                                : 'hover:bg-[#F5EFE0] text-gray-500'
                            }`}
                          >
                            <span>{emoji}</span>
                            {(post.reactions[emoji] ?? 0) > 0 && <span className="font-bold">{post.reactions[emoji]}</span>}
                          </button>
                        ))}
                        <Link
                          href={`/community/${post.id}`}
                          className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-[#0D2818] px-2.5 py-1.5 rounded-lg hover:bg-[#F5EFE0] transition-colors ml-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {post.comment_count > 0 ? `${post.comment_count}` : 'Comment'}
                        </Link>
                        <button
                          onClick={() => handleShare(post)}
                          className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-[#0D2818] px-2.5 py-1.5 rounded-lg hover:bg-[#F5EFE0] transition-colors"
                        >
                          {copiedId === post.id ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                          {copiedId === post.id ? 'Copied!' : 'Share'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}

              {loading && (
                <div className="py-12 text-center">
                  <div className="w-5 h-5 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              )}

              {!loading && posts.length === 0 && (
                <div className="py-20 text-center bg-white rounded-2xl border border-black/[0.06]">
                  <div className="w-12 h-12 bg-[#F5EFE0] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-[#DF9905]" />
                  </div>
                  <p className="text-[15px] font-bold text-[#111]">No posts yet</p>
                  <p className="text-[13px] text-gray-400 mt-1 mb-5">Be the first to post in the community</p>
                  <button
                    onClick={() => userId ? setNewPostOpen(true) : window.location.href = '/auth/login'}
                    className="inline-flex items-center gap-2 bg-[#DF9905] text-white font-bold text-[13px] px-5 py-2.5 rounded-xl hover:bg-[#A07509] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New Post
                  </button>
                </div>
              )}

              {!loading && hasMore && posts.length > 0 && (
                <button
                  onClick={() => { const next = page + 1; setPage(next); loadPosts(next) }}
                  className="w-full py-3.5 text-[13px] font-bold text-[#555] hover:text-[#111] bg-white border border-black/[0.06] rounded-2xl hover:bg-[#F5EFE0] transition-colors"
                >
                  Load more posts
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-60 shrink-0 hidden lg:block space-y-4">
            {/* Post types */}
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F0EBE0]">
                <h3 className="text-[11px] font-bold text-[#888] tracking-[0.15em]">POST TYPES</h3>
              </div>
              <div className="p-2">
                {Object.entries(TYPE_META).map(([key, m]) => {
                  const Icon = m.icon
                  return (
                    <button
                      key={key}
                      onClick={() => setFilter(filter === key ? 'all' : key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        filter === key ? 'bg-[#F5EFE0]' : 'hover:bg-[#F7F4EE]'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${m.text}`} />
                      </span>
                      <span className={`text-[13px] font-semibold ${filter === key ? 'text-[#111]' : 'text-[#444]'}`}>{m.label}s</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-[#0D2818] text-[#F5EFE0] rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/[0.04] rounded-full" />
              <div className="absolute -right-2 -bottom-6 w-28 h-28 bg-white/[0.03] rounded-full" />
              <div className="relative">
                <div className="text-[10px] font-bold text-[#DF9905] tracking-[0.15em] mb-2">TRACK YOUR GAME</div>
                <h3 className="text-[14px] font-bold mb-2 leading-snug">Log rounds & share your stats automatically</h3>
                <p className="text-[12px] text-[#7a9e85] leading-[1.6] mb-4">Every round feeds into your profile — share real data, not just scores.</p>
                <Link
                  href="/auth/signup"
                  className="block text-center text-[12.5px] font-bold bg-[#DF9905] text-white px-4 py-2.5 rounded-xl hover:bg-[#A07509] transition-colors"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {newPostOpen && (
        <NewPostModal userId={userId!} onClose={() => setNewPostOpen(false)} onPost={(p) => { setPosts(prev => [p, ...prev]); setNewPostOpen(false) }} />
      )}
    </div>
  )
}
