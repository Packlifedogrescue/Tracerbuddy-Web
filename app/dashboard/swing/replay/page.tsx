'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Play, Pause, ChevronLeft, MoreHorizontal, RotateCcw } from 'lucide-react'

const MOCK_METRICS = {
  clubSpeed:        94.0,
  attackAngle:      -3.2,
  tempoRatio:       3.1,
  clubPath:         -1.4,
  backswingMs:      800,
  downswingMs:      260,
  followthruMs:     450,
}

// ─── Frame configuration ────────────────────────────────────────────────────
// Maps to the actual files in /public/images/swing/
// When you add more frames, add entries here and upload the matching PNGs.
const FRAMES = [
  { key: 'swing_address',      label: 'Address',    p: 0.00 },
  { key: 'swing_halfway_back', label: 'Backswing',  p: 0.20 },
  { key: 'swing_top',          label: 'Top',        p: 0.35 },
  { key: 'swing_downswing',    label: 'Downswing',  p: 0.60 },
  { key: 'swing_impact',       label: 'Impact',     p: 0.72 },
  { key: 'swing_finish',       label: 'Finish',     p: 1.00 },
]
const FRAME_COUNT = FRAMES.length
// ─────────────────────────────────────────────────────────────────────────────

const BS_END_P = 0.32   // top of backswing
const IMPACT_P = 0.68   // impact
const C_SPLIT  = 0.54   // fraction of arc before impact (tuned to IMPACT_P timing)

// Dim backswing guide: always fixed — shows club path from address up to top
const BS_GUIDE = 'M 375 458 C 280 400, 150 220, 115 65'

// ─── Data-driven arc ─────────────────────────────────────────────────────────
// The arc shape is computed from real swing metrics every render.
//
//  attackAngle → steepness of the downswing arc at impact
//    • -8° steep digger : arc arrives nearly vertical
//    • -3° typical iron  : 45° approach (baseline)
//    • +2° driver sweep  : shallow, almost horizontal
//
//  clubPath → direction of the follow-through tail after impact
//    • negative IN→OUT   : tail extends further to the right
//    • positive OUT→IN   : tail curves back left (fade/slice path)
//
//  clubSpeed → glow intensity (faster = brighter arc)
//
function computeSwingArc(attackAngle: number, clubPath: number, clubSpeed: number) {
  const ix = 375, iy = 458   // impact point (fixed in canvas)
  const topX = 115, topY = 65

  // Attack angle shifts CP2 (control point before impact):
  //   steeper (more negative) → CP2 moves up & right → arc arrives more vertical
  //   shallower (positive)    → CP2 moves down & left → arc arrives near-horizontal
  const steep  = attackAngle - (-3)         // 0 at baseline -3°; negative = shallower, positive = steeper
  const cp2x   = Math.round(300 - steep * 4)
  const cp2y   = Math.round(395 + steep * 10)

  // Club path shifts the follow-through control points and endpoint:
  //   IN→OUT (negative) → tail extends rightward
  //   OUT→IN (positive) → tail curls back left
  const ft1x = Math.round(440 - clubPath * 8)
  const ft2x = Math.round(580 - clubPath * 14)
  const ft3x = Math.round(650 - clubPath * 14)
  const ft1y = Math.round(465 + clubPath * 4)
  const ft2y = Math.round(440 + clubPath * 5)
  const ft3y = Math.round(400 + clubPath * 5)

  const arcPath = `M ${topX} ${topY} C 175 90, ${cp2x} ${cp2y}, ${ix} ${iy} C ${ft1x} ${ft1y}, ${ft2x} ${ft2y}, ${ft3x} ${ft3y}`

  // Glow intensity scales with speed (90 mph = 1.0 baseline)
  const glowScale = Math.min(1.8, Math.max(0.5, clubSpeed / 90))

  // Segment control points for dot tracking
  const seg1 = { p0:[topX,topY], p1:[175,90], p2:[cp2x,cp2y], p3:[ix,iy] }
  const seg2 = { p0:[ix,iy], p1:[ft1x,ft1y], p2:[ft2x,ft2y], p3:[ft3x,ft3y] }

  return { arcPath, glowScale, seg1, seg2 }
}
// ─────────────────────────────────────────────────────────────────────────────

function cubicBezier(t: number, p0: number[], p1: number[], p2: number[], p3: number[]): [number, number] {
  const mt = 1 - t
  return [
    mt**3*p0[0] + 3*mt**2*t*p1[0] + 3*mt*t**2*p2[0] + t**3*p3[0],
    mt**3*p0[1] + 3*mt**2*t*p1[1] + 3*mt*t**2*p2[1] + t**3*p3[1],
  ]
}

// Dot tracks the backswing guide during backswing, then leads the drawing arc tip
function getDotXY(
  p: number,
  seg1: { p0:number[], p1:number[], p2:number[], p3:number[] },
  seg2: { p0:number[], p1:number[], p2:number[], p3:number[] },
): [number, number] {
  if (p <= BS_END_P) {
    return cubicBezier(p / BS_END_P, [375,458],[280,400],[150,220],[115,65])
  }
  const cT = (p - BS_END_P) / (1 - BS_END_P)
  if (cT <= C_SPLIT) {
    return cubicBezier(cT / C_SPLIT, seg1.p0, seg1.p1, seg1.p2, seg1.p3)
  }
  return cubicBezier((cT - C_SPLIT) / (1 - C_SPLIT), seg2.p0, seg2.p1, seg2.p2, seg2.p3)
}

// Snap to nearest keyframe — clean single-frame display with CSS fade between snaps
function getActiveFrame(p: number): { key: string; label: string } {
  let best = FRAMES[0]
  let bestDist = Math.abs(p - FRAMES[0].p)
  for (const f of FRAMES) {
    const d = Math.abs(p - f.p)
    if (d < bestDist) { bestDist = d; best = f }
  }
  return best
}

function ImpactBurst() {
  return (
    <div className="absolute pointer-events-none" style={{ bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}>
      {/* 24 spark rays */}
      {[...Array(24)].map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: i % 3 === 0 ? 4 : 2.5,
          height: i % 3 === 0 ? 64 : 44,
          background: `linear-gradient(to top, ${i % 3 === 0 ? '#FFE08A' : '#E8C060'}, transparent)`,
          transform: `rotate(${i * 15}deg)`,
          transformOrigin: '50% 100%',
          bottom: 0, left: '50%',
          marginLeft: i % 3 === 0 ? -2 : -1.25,
          animation: 'burst 0.65s ease-out forwards',
        }} />
      ))}
      {/* Inner flash */}
      <div className="absolute rounded-full" style={{
        width: 24, height: 24,
        background: 'radial-gradient(circle, #fff 0%, #FFE08A 50%, transparent 100%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        animation: 'flash 0.2s ease-out forwards',
      }} />
      {/* Ring pulses */}
      {[60, 100, 150].map((size, i) => (
        <div key={size} className="absolute rounded-full" style={{
          width: size, height: size,
          border: `1px solid rgba(201,168,76,${0.7 - i * 0.2})`,
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          animation: `ring-pulse ${0.5 + i * 0.15}s ease-out forwards`,
          animationDelay: `${i * 0.06}s`,
        }} />
      ))}
    </div>
  )
}

export default function SwingReplayPage() {
  const [progress,    setProgress]    = useState(0)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [speed,       setSpeed]       = useState(1.0)
  const [showImpact,  setShowImpact]  = useState(false)
  const [impactFired, setImpactFired] = useState(false)
  const rafRef   = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const m        = MOCK_METRICS

  const stopAnim = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  useEffect(() => {
    if (!isPlaying) { stopAnim(); return }
    startRef.current = performance.now()

    const bsMs = m.backswingMs   / speed
    const dsMs = m.downswingMs   / speed
    const ftMs = m.followthruMs  / speed

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      let newP: number

      if (elapsed < bsMs) {
        // Slow backswing: 0 → BS_END_P
        newP = (elapsed / bsMs) * BS_END_P
      } else if (elapsed < bsMs + dsMs) {
        // Fast downswing: BS_END_P → IMPACT_P
        const ds = elapsed - bsMs
        newP = BS_END_P + (ds / dsMs) * (IMPACT_P - BS_END_P)
      } else {
        // Follow-through: IMPACT_P → 1.0
        const ft = elapsed - bsMs - dsMs
        newP = IMPACT_P + (ft / ftMs) * (1 - IMPACT_P)
      }

      newP = Math.min(newP, 1)
      setProgress(newP)

      if (newP >= IMPACT_P - 0.03 && newP < IMPACT_P + 0.02 && !impactFired) {
        setShowImpact(true)
        setImpactFired(true)
        setTimeout(() => setShowImpact(false), 650)
      }
      if (newP < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setIsPlaying(false)
        setImpactFired(false)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return stopAnim
  }, [isPlaying, speed])

  const handlePlay = () => {
    setProgress(0)
    setImpactFired(false)
    setIsPlaying(p => !p)
  }

  const handleScrub = (v: number) => {
    stopAnim()
    setIsPlaying(false)
    setProgress(v)
  }

  const cycleSpeed = () => setSpeed(s => s === 0.5 ? 1.0 : s === 1.0 ? 2.0 : 0.5)

  // Compute data-driven arc shape from real swing metrics
  const { arcPath, glowScale, seg1, seg2 } = computeSwingArc(m.attackAngle, m.clubPath, m.clubSpeed)
  const ARC_LENGTH = 880  // approximate — constant enough for dasharray purposes

  // Arc only draws during downswing + follow-through (after top of backswing)
  const cArcProgress = Math.max(0, (progress - BS_END_P) / (1 - BS_END_P))
  const dashOffset   = ARC_LENGTH * (1 - cArcProgress)
  const [dotX, dotY] = progress > 0 && progress < 1 ? getDotXY(progress, seg1, seg2) : [0, 0]
  const activeFrame  = getActiveFrame(progress)
  // Scale fade duration to frame count — more frames = shorter fade needed
  // Downswing (260ms) has the most frames packed tightly, so use shortest fade there
  const msPerFrame   = FRAME_COUNT > 1 ? 1510 / FRAME_COUNT : 250
  const fadeMs       = progress >= BS_END_P && progress <= IMPACT_P
    ? Math.max(12, msPerFrame * 0.4)   // very short during fast downswing
    : Math.max(30, msPerFrame * 0.6)   // slightly longer during slow phases

  return (
    <>
      <style>{`
        @keyframes burst {
          0%   { opacity: 1; scaleY: 0.1; }
          60%  { opacity: 0.85; }
          100% { opacity: 0; transform: rotate(var(--r,0)) scaleY(1.2) translateY(-28px); }
        }
        @keyframes flash {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(4);   opacity: 0; }
        }
        @keyframes ring-pulse {
          0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: radial-gradient(circle, #FFE08A 0%, #C9A84C 100%);
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.2), 0 0 12px rgba(201,168,76,0.5);
        }
        input[type=range]::-webkit-slider-runnable-track { height: 3px; border-radius: 2px; }
      `}</style>

      {/* Page — warm charcoal background */}
      <div className="min-h-screen flex flex-col" style={{
        background: 'radial-gradient(ellipse at 20% 60%, #110d07 0%, #080604 55%, #070504 100%)',
        color: '#fff',
      }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/swing"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-[15px]" style={{ color: '#C9A84C' }}>TB</span>
              <span className="text-[13px] font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>·</span>
              <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>SwingTrace</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C9A84C', animation: 'dot-pulse 2s ease-in-out infinite' }} />
            <span className="text-[10px] font-bold tracking-[0.18em]" style={{ color: '#C9A84C' }}>SWING REPLAY</span>
          </div>

          <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Main area */}
        <div className="flex flex-1 gap-3 px-4 pt-3 pb-2 min-h-0">

          {/* Left metrics — glass cards */}
          <div className="flex flex-col gap-2 w-[148px] shrink-0">
            {[
              { label: 'CLUB SPEED',   value: `${m.clubSpeed}`,          unit: 'mph',    accent: '#C9A84C' },
              { label: 'ATTACK ANGLE', value: `${m.attackAngle}°`,        unit: '',       accent: '#7EC8A4' },
              { label: 'TEMPO RATIO',  value: `${m.tempoRatio}:1`,         unit: '',       accent: '#8BA7D4' },
              { label: 'CLUB PATH',    value: `${Math.abs(m.clubPath)}°`, unit: m.clubPath < 0 ? 'IN→OUT' : 'OUT→IN', accent: '#D4967A' },
            ].map(({ label, value, unit, accent }) => (
              <div key={label} className="flex-1 rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderLeft: `2px solid ${accent}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}>
                {/* Subtle top-right accent glow */}
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />
                <div className="text-[9px] font-bold tracking-[0.18em] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
                <div>
                  <div className="font-black text-[26px] leading-none tracking-tight" style={{ color: '#fff' }}>{value}</div>
                  {unit && <div className="text-[9px] font-semibold tracking-widest mt-1" style={{ color: accent }}>{unit}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Animation canvas */}
          <div className="flex-1 relative rounded-2xl overflow-hidden" style={{
            background: 'radial-gradient(ellipse at 50% 15%, #0f0d09 0%, #060504 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
          }}>
            {/* Stage spotlight from above */}
            <div className="absolute top-0 left-1/2 pointer-events-none"
              style={{ width: '70%', height: '65%', transform: 'translateX(-50%)',
                background: 'radial-gradient(ellipse at 50% 0%, rgba(255,220,130,0.06) 0%, transparent 70%)' }} />

            {/* Dramatic ground glow */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
              height: '40%',
              background: `
                radial-gradient(ellipse at 50% 100%, rgba(201,168,76,0.28) 0%, rgba(180,110,20,0.10) 45%, transparent 70%),
                linear-gradient(to top, rgba(201,168,76,0.05) 0%, transparent 100%)
              `,
            }} />

            {/* Golfer — nearest keyframe, CSS fade on snap */}
            {FRAMES.map((f) => (
              <img key={f.key} src={`/images/swing/${f.key}.png`} alt={f.label}
                className="absolute bottom-0 pointer-events-none"
                style={{
                  opacity:        f.key === activeFrame.key ? 1 : 0,
                  height:         '92%',
                  width:          'auto',
                  maxWidth:       '72%',
                  left:           '50%',
                  transform:      'translateX(-50%)',
                  objectFit:      'contain',
                  objectPosition: 'bottom center',
                  transition:     `opacity ${fadeMs}ms ease-in-out`,
                  zIndex:         10,
                  willChange:     'opacity',
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ))}

            {/* Position badge */}
            <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 20 }}>
              <div className="text-[9px] font-black tracking-[0.22em] px-3 py-1 rounded-full"
                style={{ color: '#C9A84C', background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.22)' }}>
                {activeFrame.label.toUpperCase()}
              </div>
            </div>

            {/* Arc SVG — three-layer glow for depth */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 700 520" preserveAspectRatio="none">
              <defs>
                <filter id="arc-wide" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="16" />
                </filter>
                <filter id="arc-mid" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="dotglow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE08A" />
                  <stop offset="60%" stopColor="#C9A84C" />
                  <stop offset="100%" stopColor="#A07828" />
                </linearGradient>
              </defs>

              {/* Backswing guide — subtle dashed rail */}
              <path d={BS_GUIDE} fill="none" stroke="#C9A84C" strokeWidth="1.2"
                opacity="0.12" strokeLinecap="round" strokeDasharray="5 7" />

              {/* Arc layer 1: wide ambient bloom — scales with club speed */}
              <path d={arcPath} fill="none" stroke="#C9A84C" strokeWidth="32"
                opacity={0.07 * glowScale}
                filter="url(#arc-wide)" strokeLinecap="round"
                strokeDasharray={ARC_LENGTH} strokeDashoffset={dashOffset} />
              {/* Arc layer 2: medium glow halo */}
              <path d={arcPath} fill="none" stroke="#E8C060" strokeWidth="10"
                opacity={0.22 * glowScale}
                filter="url(#arc-mid)" strokeLinecap="round"
                strokeDasharray={ARC_LENGTH} strokeDashoffset={dashOffset} />
              {/* Arc layer 3: bright core line */}
              <path d={arcPath} fill="none" stroke="url(#arcGrad)" strokeWidth="2.5"
                filter="url(#arc-mid)" strokeLinecap="round"
                strokeDasharray={ARC_LENGTH} strokeDashoffset={dashOffset} />

              {/* Club-head dot */}
              {progress > 0 && progress < 1 && (
                <>
                  <circle cx={dotX} cy={dotY} r="14" fill="rgba(255,224,138,0.12)" filter="url(#arc-wide)" />
                  <circle cx={dotX} cy={dotY} r="6"  fill="rgba(201,168,76,0.35)"  filter="url(#dotglow)" />
                  <circle cx={dotX} cy={dotY} r="3.5" fill="#FFF4D0" filter="url(#dotglow)" />
                </>
              )}
            </svg>

            {/* Impact burst */}
            {showImpact && <ImpactBurst />}

            {/* Speed badge */}
            <button onClick={cycleSpeed}
              className="absolute bottom-3 right-3 rounded-xl px-3 py-1.5 text-[11px] font-black tracking-wider transition-all hover:opacity-80"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
              {speed.toFixed(1)}×
            </button>
          </div>

          {/* Right tabs */}
          <div className="flex flex-col gap-2 w-11 shrink-0">
            {(['DTL', 'FO', '45°', '↑'] as const).map((label, i) => (
              <button key={label}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[10px] font-black tracking-wide transition-all"
                style={{
                  background: i === 0 ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: i === 0 ? '#C9A84C' : 'rgba(255,255,255,0.2)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom timeline */}
        <div className="px-4 pt-3 pb-5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-4 mb-3">
            {/* Play/pause — gold circle button */}
            <button onClick={handlePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
              style={{ background: isPlaying ? 'rgba(201,168,76,0.15)' : '#C9A84C', boxShadow: '0 0 20px rgba(201,168,76,0.35)' }}>
              {isPlaying
                ? <Pause className="w-4 h-4" style={{ color: '#C9A84C' }} />
                : <Play  className="w-4 h-4 fill-black text-black ml-0.5" />}
            </button>

            {/* Scrubber with phase markers */}
            <div className="flex-1 relative">
              <input type="range" min="0" max="100"
                value={Math.round(progress * 100)}
                onChange={e => handleScrub(Number(e.target.value) / 100)}
                className="w-full cursor-pointer relative z-10"
                style={{
                  WebkitAppearance: 'none', height: 3, borderRadius: 2, outline: 'none',
                  background: `linear-gradient(to right, #C9A84C ${progress * 100}%, rgba(255,255,255,0.1) ${progress * 100}%)`,
                }}
              />
              {/* Phase marker ticks */}
              {[BS_END_P, IMPACT_P].map((p) => (
                <div key={p} className="absolute top-1/2 -translate-y-1/2 w-px pointer-events-none"
                  style={{ left: `${p * 100}%`, height: 10, background: 'rgba(201,168,76,0.35)', zIndex: 20 }} />
              ))}
            </div>

            <button onClick={() => { setIsPlaying(false); setProgress(0); setImpactFired(false) }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {/* Phase labels */}
          <div className="flex justify-between px-10">
            {[
              { label: 'BACKSWING',     active: progress < BS_END_P },
              { label: 'IMPACT',        active: progress >= BS_END_P && progress <= IMPACT_P },
              { label: 'FOLLOW THRU',   active: progress > IMPACT_P },
            ].map(({ label, active }) => (
              <span key={label} className="text-[8px] font-black tracking-[0.18em] transition-colors"
                style={{ color: active ? '#C9A84C' : 'rgba(255,255,255,0.18)' }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
