'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageCircle, Heart, Flame, ThumbsUp, Share2,
  Flag, Lightbulb, HelpCircle, MapPin, Trophy, Plus, TrendingUp,
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
  round_recap:   { label: 'Round Recap',    icon: Trophy,      color: 'bg-green-100 text-green-700' },
  tip:           { label: 'Tip',            icon: Lightbulb,   color: 'bg-yellow-100 text-yellow-700' },
  question:      { label: 'Question',       icon: HelpCircle,  color: 'bg-blue-100 text-blue-700' },
  course_review: { label: 'Course Review',  icon: MapPin,      color: 'bg-purple-100 text-purple-700' },
}

const FILTERS = [
  { value: 'all',           label: 'All Posts' },
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
  if (d === 0) return { label: 'Even', color: 'text-gray-600' }
  if (d < 0)   return { label: `${d}`, color: 'text-green-600' }
  return { label: `+${d}`, color: 'text-red-500' }
}

export default function CommunityPage() {
  const [posts, setPosts]         = useState<Post[]>([])
  const [filter, setFilter]       = useState<string>('all')
  const [loading, setLoading]     = useState(true)
  const [userId, setUserId]       = useState<string | null>(null)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const [page, setPage]           = useState(0)
  const [hasMore, setHasMore]     = useState(true)
  const PAGE_SIZE = 15

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    setPosts([])
    setPage(0)
    setHasMore(true)
    loadPosts(0, true)
  }, [filter])

  async function loadPosts(pageNum: number, reset = false) {
    setLoading(true)
    let q = supabase
      .from('community_posts')
      .select(`
        id, user_id, type, title, content, course_name, round_id,
        round_score, round_par, round_gir, round_fairways, round_putts,
        created_at, author_name,
        community_comments(count),
        community_reactions(emoji, user_id)
      `)
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
      return {
        ...p,
        comment_count: p.community_comments?.[0]?.count ?? 0,
        reactions: reactionCounts,
        user_reaction: userReaction,
      }
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
      await supabase.from('community_reactions').delete()
        .eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji)
    } else {
      if (post.user_reaction) {
        await supabase.from('community_reactions').delete()
          .eq('post_id', postId).eq('user_id', userId)
      }
      await supabase.from('community_reactions').insert({ post_id: postId, user_id: userId, emoji })
    }

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const newReactions = { ...p.reactions }
      if (p.user_reaction === emoji) {
        newReactions[emoji] = Math.max(0, (newReactions[emoji] ?? 1) - 1)
        if (!newReactions[emoji]) delete newReactions[emoji]
        return { ...p, reactions: newReactions, user_reaction: undefined }
      } else {
        if (p.user_reaction) {
          newReactions[p.user_reaction] = Math.max(0, (newReactions[p.user_reaction] ?? 1) - 1)
          if (!newReactions[p.user_reaction]) delete newReactions[p.user_reaction]
        }
        newReactions[emoji] = (newReactions[emoji] ?? 0) + 1
        return { ...p, reactions: newReactions, user_reaction: emoji }
      }
    }))
  }

  function handleShare(post: Post) {
    const url = `${window.location.origin}/community/${post.id}`
    navigator.clipboard.writeText(url).then(() => alert('Link copied!'))
  }

  function handleNewPost(newPost: Post) {
    setPosts(prev => [newPost, ...prev])
    setNewPostOpen(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-serif font-medium text-[#111] tracking-tight">Community</h1>
          <p className="text-[14px] text-[#666] mt-1">Share rounds, tips, and golf talk with fellow TracerBuddy golfers.</p>
        </div>
        <button
          onClick={() => userId ? setNewPostOpen(true) : window.location.href = '/auth/login'}
          className="flex items-center gap-2 bg-[#DF9905] text-white font-semibold text-[13px] px-4 py-2.5 rounded-xl hover:bg-[#A07509] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      <div className="flex gap-8">
        {/* Main feed */}
        <div className="flex-1 min-w-0">
          {/* Filter tabs */}
          <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`shrink-0 text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${
                  filter === f.value
                    ? 'bg-[#111] text-white'
                    : 'text-[#555] hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Posts */}
          <div className="space-y-3">
            {posts.map(post => {
              const meta = TYPE_META[post.type]
              const Icon = meta.icon
              return (
                <div key={post.id} className="bg-white rounded-2xl border border-black/[0.05] p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow">
                  {/* Author row */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#0D2818] flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                      {post.author_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#111]">{post.author_name}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {meta.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <Link href={`/community/${post.id}`}>
                    <h2 className="text-[15px] font-semibold text-[#111] mb-1.5 hover:text-[#DF9905] transition-colors leading-snug">{post.title}</h2>
                  </Link>
                  <p className="text-[13.5px] text-[#444] leading-[1.6] line-clamp-3">{post.content}</p>

                  {/* Round stats badge */}
                  {post.type === 'round_recap' && post.round_score && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <div className="flex items-center gap-3 bg-[#F5EFE0] rounded-xl px-3.5 py-2">
                        <div className="text-center">
                          <div className="text-[18px] font-bold text-[#111] leading-none">{post.round_score}</div>
                          {post.round_par && (
                            <div className={`text-[11px] font-semibold mt-0.5 ${scoreDiff(post.round_score, post.round_par).color}`}>
                              {scoreDiff(post.round_score, post.round_par).label}
                            </div>
                          )}
                        </div>
                        {post.course_name && (
                          <div className="border-l border-black/10 pl-3">
                            <div className="text-[11px] text-gray-500">Course</div>
                            <div className="text-[12px] font-semibold text-[#111] max-w-[140px] truncate">{post.course_name}</div>
                          </div>
                        )}
                        {post.round_gir !== undefined && post.round_gir !== null && (
                          <div className="border-l border-black/10 pl-3">
                            <div className="text-[11px] text-gray-500">GIR</div>
                            <div className="text-[12px] font-semibold text-[#111]">{post.round_gir}%</div>
                          </div>
                        )}
                        {post.round_putts !== undefined && post.round_putts !== null && (
                          <div className="border-l border-black/10 pl-3">
                            <div className="text-[11px] text-gray-500">Putts/hole</div>
                            <div className="text-[12px] font-semibold text-[#111]">{post.round_putts}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(post.id, emoji)}
                        className={`flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg transition-colors ${
                          post.user_reaction === emoji
                            ? 'bg-[#FEF3E8] text-[#E87830] font-semibold'
                            : 'hover:bg-gray-100 text-gray-500'
                        }`}
                      >
                        <span>{emoji}</span>
                        {(post.reactions[emoji] ?? 0) > 0 && (
                          <span className="font-semibold">{post.reactions[emoji]}</span>
                        )}
                      </button>
                    ))}
                    <Link
                      href={`/community/${post.id}`}
                      className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors ml-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.comment_count > 0 ? post.comment_count : 'Comment'}
                    </Link>
                    <button
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}

            {!loading && posts.length === 0 && (
              <div className="py-16 text-center bg-white rounded-2xl border border-black/[0.05]">
                <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-gray-400">No posts yet</p>
                <p className="text-[13px] text-gray-300 mt-1">Be the first to post!</p>
              </div>
            )}

            {!loading && hasMore && posts.length > 0 && (
              <button
                onClick={() => { const next = page + 1; setPage(next); loadPosts(next) }}
                className="w-full py-3 text-[13px] font-semibold text-[#555] hover:text-[#111] bg-white border border-black/[0.05] rounded-xl hover:bg-gray-50 transition-colors"
              >
                Load more
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 shrink-0 hidden lg:block space-y-4">
          <div className="bg-white rounded-2xl border border-black/[0.05] p-5">
            <h3 className="text-[13px] font-bold text-[#111] mb-3">Post types</h3>
            <div className="space-y-2">
              {Object.entries(TYPE_META).map(([key, m]) => {
                const Icon = m.icon
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(filter === key ? 'all' : key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                      filter === key ? 'bg-[#F5EFE0]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${m.color}`}>
                      <Icon className="w-3 h-3" />
                    </span>
                    <span className="text-[12.5px] font-medium text-[#333]">{m.label}s</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-[#0D2818] text-[#F5EFE0] rounded-2xl p-5">
            <h3 className="text-[13px] font-bold mb-2">Track your rounds</h3>
            <p className="text-[12px] text-[#aaa] leading-[1.6] mb-4">Log rounds in the app and share your stats with the community automatically.</p>
            <Link
              href="/auth/signup"
              className="block text-center text-[12px] font-bold bg-[#DF9905] text-white px-4 py-2 rounded-lg hover:bg-[#A07509] transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>

      {newPostOpen && (
        <NewPostModal
          userId={userId!}
          onClose={() => setNewPostOpen(false)}
          onPost={handleNewPost}
        />
      )}
    </div>
  )
}
