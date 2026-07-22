'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NotificationPanel from './NotificationPanel'

export default function NotificationBell({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const [open, setOpen]       = useState(false)
  const [unread, setUnread]   = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    async function count() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const readStored: string[] = JSON.parse(localStorage.getItem('tb_read_notifs') || '[]')
      const readSet = new Set(readStored)
      let total = 0

      // Buddy requests
      const { count: pending } = await supabase
        .from('buddy_connections')
        .select('*', { count: 'exact', head: true })
        .eq('buddy_id', user.id)
        .eq('status', 'pending')
      total += pending ?? 0

      // Recent rounds not yet read
      const { data: rounds } = await supabase
        .from('rounds')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      for (const r of rounds ?? []) {
        if (!readSet.has(`round-${r.id}`) && !readSet.has(`best-${r.id}`)) total++
      }

      // Community comments on my posts not yet read
      const { data: myPosts } = await supabase
        .from('community_posts')
        .select('id')
        .eq('user_id', user.id)
      const myPostIds = (myPosts ?? []).map((p: any) => p.id)
      if (myPostIds.length > 0) {
        const { data: comments } = await supabase
          .from('community_comments')
          .select('id')
          .in('post_id', myPostIds)
          .neq('user_id', user.id)
        for (const c of comments ?? []) {
          if (!readSet.has(`community-comment-${c.id}`)) total++
        }

        // Reactions on my posts not yet read (one per post)
        const { data: reactions } = await supabase
          .from('community_reactions')
          .select('post_id')
          .in('post_id', myPostIds)
          .neq('user_id', user.id)
        const reactionPosts = Array.from(new Set((reactions ?? []).map((r: any) => r.post_id)))
        for (const postId of reactionPosts) {
          if (!readSet.has(`community-reaction-${postId}`)) total++
        }
      }

      setUnread(Math.min(total, 9))
    }
    count()
  }, [open])

  const hoverBg = variant === 'light' ? 'hover:bg-white/10' : 'hover:bg-[#F5EFE0]'
  const iconColor = variant === 'light' ? 'text-white/80' : 'text-gray-500'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative w-9 h-9 rounded-full ${hoverBg} flex items-center justify-center transition-colors`}
        aria-label="Notifications"
      >
        <Bell className={`w-[18px] h-[18px] ${iconColor}`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#DF9905] rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[9px] font-bold text-white leading-none px-0.5">{unread}</span>
          </span>
        )}
      </button>
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  )
}
