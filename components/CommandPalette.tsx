'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Home, FileText, Map, Activity, Watch, Wrench,
  BarChart2, Settings2, Target, Dumbbell, Brain, Trophy,
  Users, Flag, X, ArrowRight, Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const PAGES = [
  { href: '/dashboard',            icon: Home,     label: 'Dashboard',   desc: 'Home overview' },
  { href: '/dashboard/rounds',     icon: FileText,  label: 'Rounds',      desc: 'All your rounds' },
  { href: '/dashboard/courses',    icon: Map,       label: 'Courses',     desc: 'Course search & maps' },
  { href: '/dashboard/swing',      icon: Activity,  label: 'SwingTrace',  desc: 'Swing speed & tempo' },
  { href: '/dashboard/watch',      icon: Watch,     label: 'Apple Watch', desc: 'Watch data & sync' },
  { href: '/dashboard/putting',    icon: Target,    label: 'Putting',     desc: 'Putt stats & analysis' },
  { href: '/dashboard/clubs',      icon: Wrench,    label: 'My Bag',      desc: 'Club distances & fitting' },
  { href: '/dashboard/practice',   icon: Dumbbell,  label: 'Practice',    desc: 'Range sessions' },
  { href: '/dashboard/coach',      icon: Brain,     label: 'AI Coach',    desc: 'Coach cards & insights' },
  { href: '/dashboard/goals',      icon: Flag,      label: 'Goals',       desc: 'Handicap & score goals' },
  { href: '/dashboard/tournament', icon: Trophy,    label: 'Tournament',  desc: 'Match play & Stableford' },
  { href: '/dashboard/buddies',    icon: Users,     label: 'Buddies',     desc: 'Friends & leaderboard' },
  { href: '/dashboard/stats',      icon: BarChart2, label: 'Insights',    desc: 'Full stats overview' },
  { href: '/dashboard/profile',    icon: Settings2, label: 'Settings',    desc: 'Profile & subscription' },
]

type Round = { id: string; course_name: string; score: number; played_at: string; course_par: number }

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [rounds, setRounds] = useState<Round[]>([])
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
      supabase
        .from('rounds')
        .select('id, course_name, score, played_at, course_par')
        .order('played_at', { ascending: false })
        .limit(50)
        .then(({ data }) => setRounds(data ?? []))
    }
  }, [open])

  const q = query.toLowerCase().trim()

  const filteredPages = q
    ? PAGES.filter(p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
    : PAGES

  const filteredRounds = rounds.filter(r =>
    !q || r.course_name?.toLowerCase().includes(q) ||
    new Date(r.played_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase().includes(q)
  ).slice(0, q ? 8 : 4)

  const allItems = [
    ...filteredPages.map(p => ({ type: 'page' as const, ...p })),
    ...filteredRounds.map(r => ({ type: 'round' as const, href: `/dashboard/rounds/${r.id}`, ...r })),
  ]

  const navigate = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && allItems[selected]) navigate(allItems[selected].href)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, allItems, selected, navigate, onClose])

  useEffect(() => { setSelected(0) }, [query])

  if (!open) return null

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function scoreDiff(score: number, par: number) {
    const d = score - par
    if (d === 0) return { label: 'E', color: 'text-gray-500' }
    if (d < 0)   return { label: `${d}`, color: 'text-green-600' }
    return { label: `+${d}`, color: 'text-red-500' }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.2)] overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search rounds, courses, or navigate..."
            className="flex-1 text-[14px] text-[#111] placeholder-gray-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:block text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 font-mono shrink-0">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">

          {/* Pages */}
          {filteredPages.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 tracking-wider">
                {q ? 'PAGES' : 'QUICK NAVIGATE'}
              </div>
              {filteredPages.map((page, i) => {
                const Icon = page.icon
                const isSelected = allItems.indexOf(allItems.find(a => a.href === page.href)!) === selected
                return (
                  <button
                    key={page.href}
                    onClick={() => navigate(page.href)}
                    onMouseEnter={() => setSelected(allItems.findIndex(a => a.href === page.href))}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-[#FEF3E8]' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#E87830]/10' : 'bg-gray-100'}`}>
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E87830]' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-medium ${isSelected ? 'text-[#E87830]' : 'text-[#111]'}`}>{page.label}</div>
                      <div className="text-[11px] text-gray-400">{page.desc}</div>
                    </div>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#E87830] shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Rounds */}
          {filteredRounds.length > 0 && (
            <div className={filteredPages.length > 0 ? 'border-t border-gray-100 mt-1 pt-1' : ''}>
              <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 tracking-wider">
                {q ? 'ROUNDS' : 'RECENT ROUNDS'}
              </div>
              {filteredRounds.map(round => {
                const idx = allItems.findIndex(a => a.href === `/dashboard/rounds/${round.id}`)
                const isSelected = idx === selected
                const diff = scoreDiff(round.score, round.course_par || 72)
                return (
                  <button
                    key={round.id}
                    onClick={() => navigate(`/dashboard/rounds/${round.id}`)}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-[#FEF3E8]' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#E87830]/10' : 'bg-gray-100'}`}>
                      <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E87830]' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-medium truncate ${isSelected ? 'text-[#E87830]' : 'text-[#111]'}`}>{round.course_name}</div>
                      <div className="text-[11px] text-gray-400">{formatDate(round.played_at)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[13px] font-bold text-[#111]">{round.score}</span>
                      <span className={`text-[12px] font-semibold ${diff.color}`}>{diff.label}</span>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#E87830]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {allItems.length === 0 && (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-[13px] text-gray-400">No results for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><kbd className="bg-white border border-gray-200 rounded px-1 font-mono text-[9px]">↑↓</kbd> navigate</span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><kbd className="bg-white border border-gray-200 rounded px-1 font-mono text-[9px]">↵</kbd> open</span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><kbd className="bg-white border border-gray-200 rounded px-1 font-mono text-[9px]">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
