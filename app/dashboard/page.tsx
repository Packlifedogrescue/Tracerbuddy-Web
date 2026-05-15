'use client'
import Link from 'next/link'
import {
  Calendar, SlidersHorizontal, Info, Target, Star, ChevronRight,
  ChevronLeft, Maximize2, TrendingUp, TrendingDown, Clock,
  ExternalLink, RefreshCcw, Zap, ArrowUp, ArrowDown,
} from 'lucide-react'

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({
  data,
  color = '#C9A84C',
  w = 80,
  h = 28,
}: {
  data: number[]
  color?: string
  w?: number
  h?: number
}) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = (max - min) || 1
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────
const statCards = [
  {
    label: 'Handicap (Trend)',
    value: '7.2',
    delta: '0.3',
    dir: 'down',
    positive: true,
    footer: 'Low this year: 6.8',
    data: [8.1, 7.9, 7.8, 7.6, 7.5, 7.4, 7.2],
  },
  {
    label: 'Fairways Hit',
    value: '64%',
    delta: '8%',
    dir: 'up',
    positive: true,
    footer: 'Tour Avg: 56%',
    data: [55, 57, 58, 60, 61, 62, 64],
  },
  {
    label: 'GIR',
    value: '71%',
    delta: '6%',
    dir: 'up',
    positive: true,
    footer: 'Tour Avg: 65%',
    data: [62, 64, 65, 67, 68, 70, 71],
  },
  {
    label: 'Putts per Round',
    value: '29.1',
    delta: '1.4',
    dir: 'down',
    positive: true,
    footer: 'Tour Avg: 29.0',
    data: [31.2, 30.8, 30.5, 30.1, 29.8, 29.4, 29.1],
  },
  {
    label: 'Strokes Gained',
    value: '+1.24',
    delta: '0.41',
    dir: 'up',
    positive: true,
    footer: 'Tour Avg: +0.21',
    data: [0.58, 0.72, 0.85, 0.95, 1.05, 1.15, 1.24],
  },
]

const recentRounds = [
  { course: 'TPC Scottsdale',             date: 'May 16, 2025',  score: 68, toPar: -4, sg: '+1.24', pos: true,  color: '#2D6A4F' },
  { course: 'Desert Mountain (Cochise)',   date: 'May 10, 2025',  score: 72, toPar:  0, sg: '+0.21', pos: true,  color: '#8B4513' },
  { course: 'Grayhawk Golf Club (Raptor)', date: 'May 3, 2025',   score: 71, toPar: -1, sg: '+0.68', pos: true,  color: '#2E7D32' },
  { course: 'We-Ko-Pa (Saguaro)',          date: 'Apr 26, 2025',  score: 75, toPar:  3, sg: '-0.47', pos: false, color: '#6D4C41' },
  { course: 'Troon North (Monument)',      date: 'Apr 19, 2025',  score: 70, toPar: -2, sg: '+0.92', pos: true,  color: '#1B5E20' },
]

const bag = [
  { club: 'Driver',  name: 'Titleist TSR3',                 icon: '🏌️' },
  { club: '3 Wood',  name: 'Titleist GT3',                  icon: '⛳' },
  { club: '7 Iron',  name: 'Titleist T200',                 icon: '🎯' },
  { club: 'Putter',  name: 'Scotty Cameron Phantom X 7.5',  icon: '🏆' },
]

const clubPerf = [
  { abbr: 'Dr',  dist: 287 },
  { abbr: '3W',  dist: 247 },
  { abbr: '5W',  dist: 227 },
  { abbr: '7i',  dist: 175 },
  { abbr: '9i',  dist: 148 },
  { abbr: 'PW',  dist: 122 },
]

const insights = [
  {
    color: 'text-[#C9A84C]',
    bg: 'bg-amber-50',
    text: 'Approach play is costing you 0.58 strokes per round.',
  },
  {
    color: 'text-[#22A06B]',
    bg: 'bg-green-50',
    text: 'Your driving accuracy is trending up (+8% vs last 30 days).',
  },
  {
    color: 'text-[#22A06B]',
    bg: 'bg-green-50',
    text: 'Excellent short game this week (+1.24 SG around the green).',
  },
]

// Shot tracer positions (% of image area)
const shots = [
  { x: 49, y: 79, label: 'Driver\n298 yds' },
  { x: 56, y: 60, label: '3 Wood\n223 yds' },
  { x: 62, y: 43, label: '7 Iron\n162 yds' },
  { x: 63, y: 31, label: '2 Putts\nOn Green', green: true },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const maxDist = 320

  return (
    <div className="p-5 md:p-6 space-y-4 min-h-full pb-8">

      {/* ── Welcome + Date picker ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black text-[#111] tracking-tight leading-tight">
            Welcome back, Brett
          </h1>
          <p className="text-[13.5px] text-gray-500 mt-0.5">Every round becomes usable data.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3.5 py-2 text-[13px] font-medium text-[#111] hover:border-gray-300 transition-colors shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            May 11 – May 17, 2025
          </button>
          <button className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:border-gray-300 transition-colors shadow-sm">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map(c => (
          <div
            key={c.label}
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Label + info */}
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                {c.label}
              </span>
              <Info className="w-3 h-3 text-gray-300 shrink-0" />
            </div>
            {/* Value */}
            <div className="text-[28px] font-black text-[#111] leading-none mb-1.5">
              {c.value}
            </div>
            {/* Delta */}
            <div className="flex items-center gap-1 mb-3">
              <span
                className={`flex items-center gap-0.5 text-[12px] font-semibold ${
                  c.positive ? 'text-[#22A06B]' : 'text-red-500'
                }`}
              >
                {c.dir === 'up' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {c.delta}
              </span>
              <span className="text-[11px] text-gray-400">vs last 30 days</span>
            </div>
            {/* Sparkline */}
            <div className="flex justify-center mb-2">
              <Sparkline data={c.data} color="#C9A84C" />
            </div>
            {/* Footer */}
            <div className="text-[11px] text-gray-400">{c.footer}</div>
          </div>
        ))}
      </div>

      {/* ── Main grid: left content + right panel ── */}
      <div className="flex gap-4 items-start">

        {/* ── Left: Latest Round + bottom row ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Latest Round card */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="flex min-h-[240px]">

              {/* Left: round info */}
              <div className="p-5 w-[42%] shrink-0 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Latest Round
                  </div>
                  <div className="text-[22px] font-black text-[#111] leading-tight">TPC Scottsdale</div>
                  <div className="text-[13px] text-gray-500 mb-3">Stadium Course</div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-3 text-[12.5px] text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        May 16, 2025
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="4.5" stroke="#9CA3AF" strokeWidth="1"/>
                          <path d="M6 3v3l2 1.5" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                        Scottsdale, AZ
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[12.5px] text-gray-600">
                      <span>72°F</span>
                      <span>3 mph, SE</span>
                    </div>
                  </div>

                  <div className="flex items-end gap-4">
                    <div>
                      <div className="text-[44px] font-black text-[#C9A84C] leading-none">68</div>
                    </div>
                    <div className="pb-1.5 space-y-0.5">
                      <div className="text-[13px] text-gray-500">
                        <span className="font-bold text-[#111]">−4</span> Total
                      </div>
                      <div className="text-[13px] text-gray-500">
                        <span className="font-bold text-[#111]">T3</span> Position
                      </div>
                    </div>
                  </div>
                </div>

                <button className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111] hover:text-[#C9A84C] transition-colors mt-3">
                  View Round Details
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right: course image + shot tracer */}
              <div className="flex-1 relative overflow-hidden">
                {/* Gradient fade on left edge */}
                <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                {/* Expand icon */}
                <button className="absolute top-3 right-3 z-20 w-7 h-7 bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/50 transition-colors">
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </button>

                <img
                  src="/images/hero-course.jpg"
                  alt="TPC Scottsdale aerial"
                  className="w-full h-full object-cover"
                />

                {/* Shot tracer SVG */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* Connecting line */}
                  <polyline
                    points={shots.map(s => `${s.x},${s.y}`).join(' ')}
                    stroke="white"
                    strokeWidth="0.7"
                    fill="none"
                    opacity="0.85"
                  />
                  {/* Dots */}
                  {shots.map((s, i) => (
                    <circle
                      key={i}
                      cx={s.x}
                      cy={s.y}
                      r={s.green ? '1.8' : '1.4'}
                      fill={s.green ? '#22C55E' : 'white'}
                      stroke="white"
                      strokeWidth="0.4"
                    />
                  ))}
                </svg>

                {/* Shot labels (HTML for text quality) */}
                {shots.map((s, i) => (
                  <div
                    key={i}
                    className="absolute z-10 pointer-events-none"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      transform: 'translate(-50%, -130%)',
                    }}
                  >
                    <div className="bg-[#111]/80 backdrop-blur-sm text-white text-[9px] font-semibold px-1.5 py-1 rounded-md whitespace-pre text-center leading-tight shadow-lg border border-white/10">
                      {s.label}
                    </div>
                  </div>
                ))}

                {/* Hole nav bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 py-2 bg-black/40 backdrop-blur-sm z-10">
                  <button className="text-white/70 hover:text-white">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-white text-[11px] font-semibold">
                    Hole 18 &nbsp;·&nbsp; Par 4 &nbsp;·&nbsp; 462 yds
                  </span>
                  <button className="text-white/70 hover:text-white">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom row: Recent Rounds | SwingTrace | Apple Watch ── */}
          <div className="grid grid-cols-12 gap-4">

            {/* Recent Rounds */}
            <div className="col-span-5 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-[13.5px] font-bold text-[#111]">Recent Rounds</span>
                <Link href="/dashboard/rounds" className="text-[12px] font-semibold text-[#C9A84C] hover:text-[#A07828] transition-colors">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {/* Table header */}
                <div className="grid grid-cols-12 px-4 py-2 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-5">Course</div>
                  <div className="col-span-3">Date</div>
                  <div className="col-span-1 text-center">Score</div>
                  <div className="col-span-1 text-center">To Par</div>
                  <div className="col-span-2 text-right">SG</div>
                </div>
                {recentRounds.map((r, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {/* Course */}
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg shrink-0"
                        style={{ background: r.color }}
                      />
                      <span className="text-[12px] font-medium text-[#111] truncate">{r.course}</span>
                    </div>
                    {/* Date */}
                    <div className="col-span-3 text-[11.5px] text-gray-500">{r.date}</div>
                    {/* Score */}
                    <div className="col-span-1 text-center text-[13px] font-bold text-[#111]">{r.score}</div>
                    {/* To Par */}
                    <div
                      className={`col-span-1 text-center text-[12px] font-semibold ${
                        r.toPar < 0 ? 'text-[#22A06B]' : r.toPar > 0 ? 'text-red-500' : 'text-gray-500'
                      }`}
                    >
                      {r.toPar === 0 ? 'E' : r.toPar > 0 ? `+${r.toPar}` : r.toPar}
                    </div>
                    {/* SG */}
                    <div
                      className={`col-span-2 text-right flex items-center justify-end gap-1 text-[12px] font-semibold ${
                        r.pos ? 'text-[#22A06B]' : 'text-red-500'
                      }`}
                    >
                      {r.pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {r.sg}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SwingTrace Preview */}
            <div className="col-span-4 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-[13.5px] font-bold text-[#111]">SwingTrace Preview</span>
                <Link href="/dashboard/swing" className="text-[12px] font-semibold text-[#C9A84C] hover:text-[#A07828] transition-colors">
                  View Full Report
                </Link>
              </div>
              <div className="px-4 py-3">
                <div className="text-[11.5px] text-gray-400 mb-3">May 16, 2025 · 18 Swings</div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Swing Speed', val: '114.2', unit: 'MPH' },
                    { label: 'Tempo',       val: '3.1:1', unit: '', badge: 'Good' },
                    { label: 'Backswing',   val: '0.92',  unit: 'SEC' },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <div className="text-[21px] font-black text-[#111] leading-tight">{m.val}</div>
                      {m.badge && (
                        <span className="inline-block text-[9.5px] font-bold bg-[#22A06B] text-white px-1.5 py-0.5 rounded-full mb-0.5">
                          {m.badge}
                        </span>
                      )}
                      <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                        {m.label}
                        {m.unit && <span className="ml-1 text-gray-400">{m.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Golfer silhouette */}
                <div className="flex items-end justify-center h-24 overflow-hidden">
                  <img
                    src="/images/golfer.png"
                    alt="Swing silhouette"
                    className="h-24 object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Apple Watch */}
            <div className="col-span-3 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-[13.5px] font-bold text-[#111]">Apple Watch</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#22A06B]">
                  Synced
                  <span className="w-1.5 h-1.5 bg-[#22A06B] rounded-full animate-pulse" />
                </span>
              </div>
              <div className="px-4 py-4 flex flex-col items-center">
                {/* Watch face */}
                <div className="relative mb-3">
                  <div className="w-[88px] h-[100px] bg-[#1A1A1A] rounded-[22px] flex flex-col items-center justify-center border-[3px] border-[#2A2A2A] shadow-lg">
                    <div className="text-[9px] text-gray-500 font-medium">Round</div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[28px] font-black text-white leading-none">68</span>
                    </div>
                    <div className="text-[10px] font-bold text-[#22C55E]">(-4)</div>
                    <div className="mt-1.5 w-14 border-t border-white/10 pt-1.5">
                      <div className="text-[8px] text-gray-500 text-center leading-tight">SG Total / Putts</div>
                      <div className="text-[10px] font-black text-[#C9A84C] text-center">+1.24 / 28</div>
                    </div>
                  </div>
                  {/* Crown button */}
                  <div className="absolute -right-1 top-8 w-1.5 h-6 bg-[#2A2A2A] rounded-r-lg" />
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1 mb-3">
                  <Clock className="w-3 h-3" />
                  Last sync: Today, 10:00 AM
                </div>
                <button className="flex items-center gap-1.5 text-[12px] font-semibold text-[#111] border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                  Open on Watch
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-[272px] shrink-0 space-y-3">

          {/* Next Best Action */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FEF3E8] flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-[#E87830]" />
              </div>
              <span className="text-[13px] font-bold text-[#111]">Next Best Action</span>
            </div>
            <div className="text-[15.5px] font-black text-[#111] leading-snug mb-2">
              Focus on approach shots 150–175 yards
            </div>
            <span className="inline-block bg-[#FEF3E8] text-[#C9A84C] text-[10.5px] font-bold px-2.5 py-1 rounded-full border border-[#F0D090] mb-3">
              High Impact
            </span>
            <p className="text-[12px] text-gray-500 leading-relaxed mb-4">
              You lose 0.58 strokes per round on approach shots from this distance—more than any other range in your game.
            </p>
            <button className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111] border border-gray-200 rounded-lg px-3.5 py-2 w-full justify-between hover:bg-gray-50 transition-colors">
              View Practice Plan
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Favorite Course */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-[#C9A84C] fill-[#C9A84C]" />
                <span className="text-[13px] font-bold text-[#111]">Favorite Course</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="text-[15px] font-black text-[#111] leading-tight">TPC Scottsdale</div>
            <div className="text-[12px] text-gray-500 mb-3">Stadium Course</div>
            <div className="grid grid-cols-3 gap-1 text-center">
              {[
                { label: 'Avg Score',         val: '69.2' },
                { label: 'Best Round',        val: '64 (-8)' },
                { label: 'Most Lost Strokes', val: 'Approach' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[11.5px] font-bold text-[#111] leading-tight">{s.val}</div>
                  <div className="text-[9.5px] text-gray-400 leading-tight mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Round Insights */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span className="text-[13px] font-bold text-[#111]">Round Insights</span>
              </div>
              <span className="text-[10px] font-semibold text-[#22A06B] bg-green-50 px-1.5 py-0.5 rounded-full">
                Updated
              </span>
            </div>
            <div className="space-y-2.5">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-lg ${ins.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${ins.color.replace('text-', 'bg-')}`} />
                  </div>
                  <p className="text-[12px] text-gray-600 leading-relaxed">{ins.text}</p>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1 text-[12px] font-semibold text-[#C9A84C] mt-3 hover:text-[#A07828] transition-colors">
              View All Insights
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Bag */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-[#111]">Current Bag</span>
              <button className="text-[12px] font-semibold text-[#C9A84C] hover:text-[#A07828] transition-colors">
                Manage
              </button>
            </div>
            <div className="space-y-2">
              {bag.map(b => (
                <div key={b.club} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[14px] shrink-0">
                    {b.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-[#111]">{b.club}</div>
                    <div className="text-[11px] text-gray-400 truncate">{b.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Club Performance */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-bold text-[#111]">Club Performance</span>
              <button className="text-[12px] font-semibold text-[#C9A84C] hover:text-[#A07828] transition-colors">
                View All
              </button>
            </div>
            <div className="text-[11px] text-gray-400 mb-3">Carry Distance (yds)</div>
            <div className="space-y-2">
              {clubPerf.map(c => (
                <div key={c.abbr} className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold text-gray-500 w-6 shrink-0">{c.abbr}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9A84C] rounded-full transition-all"
                      style={{ width: `${(c.dist / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11.5px] font-bold text-[#111] w-7 text-right shrink-0">{c.dist}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1 text-[10.5px] text-gray-400">
                <span className="w-2.5 h-2 rounded-sm bg-[#C9A84C] inline-block" />
                Your Avg
              </span>
              <span className="flex items-center gap-1 text-[10.5px] text-gray-400">
                <span className="w-2.5 h-2 rounded-sm bg-gray-200 inline-block" />
                Tour Avg
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
