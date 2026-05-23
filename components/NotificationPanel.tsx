'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Users, Trophy, TrendingDown, Flag, CheckCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Notification = {
  id: string
  type: 'buddy_request' | 'handicap' | 'best_round' | 'milestone' | 'round_complete'
  title: string
  body: string
  href: string
  time: Date
  read: boolean
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const ICON: Record<string, React.ElementType> = {
  buddy_request:  Users,
  handicap:       TrendingDown,
  best_round:     Trophy,
  milestone:      Flag,
  round_complete: CheckCircle,
}

const COLOR: Record<string, string> = {
  buddy_request:  'bg-blue-100 text-blue-600',
  handicap:       'bg-green-100 text-green-600',
  best_round:     'bg-[#FEF3E8] text-[#E87830]',
  milestone:      'bg-purple-100 text-purple-600',
  round_complete: 'bg-green-100 text-green-600',
}

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [notes, setNotes] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load previously read IDs from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('tb_read_notifs') || '[]')
      setReadIds(new Set(stored))
    } catch {}
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const generated: Notification[] = []

      // 1. Pending buddy requests sent TO the current user
      const { data: buddyReqs } = await supabase
        .from('buddy_connections')
        .select('id, created_at, user:user_id(display_name)')
        .eq('buddy_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)

      for (const r of buddyReqs ?? []) {
        const name = (r.user as any)?.display_name ?? 'Someone'
        generated.push({
          id: `buddy-${r.id}`,
          type: 'buddy_request',
          title: 'Buddy request',
          body: `${name} wants to be your buddy`,
          href: '/dashboard/buddies',
          time: new Date(r.created_at),
          read: false,
        })
      }

      // 2. Recent rounds — celebrate each one
      const { data: recentRounds } = await supabase
        .from('rounds')
        .select('id, course_name, score, course_par, played_at')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(5)

      // Best round detection
      const { data: allRounds } = await supabase
        .from('rounds')
        .select('score, course_par, played_at')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })

      let bestDiff = Infinity
      if (allRounds && allRounds.length > 1) {
        for (const r of allRounds.slice(1)) {
          const d = r.score - (r.course_par || 72)
          if (d < bestDiff) bestDiff = d
        }
      }

      for (const r of recentRounds ?? []) {
        const diff = r.score - (r.course_par || 72)
        const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
        const isBest = allRounds && allRounds.length > 1 && diff < bestDiff

        if (isBest) {
          generated.push({
            id: `best-${r.id}`,
            type: 'best_round',
            title: 'New personal best!',
            body: `${r.score} (${diffLabel}) at ${r.course_name}`,
            href: `/dashboard/rounds/${r.id}`,
            time: new Date(r.played_at),
            read: false,
          })
        } else {
          generated.push({
            id: `round-${r.id}`,
            type: 'round_complete',
            title: 'Round logged',
            body: `${r.score} (${diffLabel}) at ${r.course_name}`,
            href: `/dashboard/rounds/${r.id}`,
            time: new Date(r.played_at),
            read: false,
          })
        }
      }

      // 3. Handicap improvement milestone
      const { data: hxRaw } = await supabase
        .from('handicap_history')
        .select('handicap_index, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(10)

      if (hxRaw && hxRaw.length >= 2) {
        const latest = hxRaw[0].handicap_index
        const prev   = hxRaw[hxRaw.length - 1].handicap_index
        const drop   = +(prev - latest).toFixed(1)
        if (drop >= 1) {
          generated.push({
            id: `hdcp-${hxRaw[0].recorded_at}`,
            type: 'handicap',
            title: `Handicap down ${drop} strokes`,
            body: `You're now playing off ${latest} — keep it up!`,
            href: '/dashboard/stats',
            time: new Date(hxRaw[0].recorded_at),
            read: false,
          })
        }
      }

      // Sort by time, apply read state
      generated.sort((a, b) => b.time.getTime() - a.time.getTime())
      setNotes(generated)
      setLoading(false)
    }
    load()
  }, [])

  function markAllRead() {
    const allIds = notes.map(n => n.id)
    setReadIds(new Set(allIds))
    localStorage.setItem('tb_read_notifs', JSON.stringify(allIds))

  }

  function markRead(id: string) {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('tb_read_notifs', JSON.stringify(Array.from(next)))
      return next
    })
  }

  function handleClick(n: Notification) {
    markRead(n.id)
    router.push(n.href)
    onClose()
  }

  const unread = notes.filter(n => !readIds.has(n.id))

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#111]">Notifications</span>
          {unread.length > 0 && (
            <span className="text-[10px] font-bold bg-[#DF9905] text-white px-1.5 py-0.5 rounded-full">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="text-[11px] text-[#DF9905] font-semibold hover:underline">
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[380px] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-5 h-5 border-2 border-[#DF9905] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : notes.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400">No notifications yet</p>
            <p className="text-[11px] text-gray-300 mt-1">Play a round to get started</p>
          </div>
        ) : (
          notes.map(n => {
            const Icon = ICON[n.type]
            const isRead = readIds.has(n.id)
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${isRead ? 'opacity-60' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${COLOR[n.type]}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-[#111] leading-tight">{n.title}</span>
                    {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#DF9905] shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-[11.5px] text-gray-500 mt-0.5 leading-tight">{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.time)}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
