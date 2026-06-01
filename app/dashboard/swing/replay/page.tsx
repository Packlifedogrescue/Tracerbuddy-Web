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

const FRAMES = [
  { key: 'swing_address',       label: 'Address',     p: 0.00 },
  { key: 'swing_halfway_back',  label: 'Halfway',     p: 0.20 },
  { key: 'swing_top',           label: 'Top',         p: 0.33 },
  { key: 'swing_downswing',     label: 'Downswing',   p: 0.55 },
  { key: 'swing_impact',        label: 'Impact',      p: 0.68 },
  { key: 'swing_finish',        label: 'Finish',      p: 1.00 },
]

// Full swing oval: address (bottom-RIGHT) → top of backswing (upper-right)
//   → impact (bottom-LEFT, ~150px offset) → follow-through (upper-left)
// Offset prevents V-shape — the two arcs form a proper teardrop oval.
const ARC_PATH   = 'M 455 460 C 575 295, 645 112, 592 66 C 538 18, 265 368, 298 456 C 252 350, 138 145, 118 68'
const ARC_LENGTH = 1520
const BS_END_P   = 0.32   // backswing ends at top of backswing
const IMPACT_P   = 0.68   // downswing completes at impact

// Segment control points matching ARC_PATH
const SEG1 = { p0:[455,460], p1:[575,295], p2:[645,112], p3:[592,66]  }
const SEG2 = { p0:[592,66],  p1:[538,18],  p2:[265,368], p3:[298,456] }
const SEG3 = { p0:[298,456], p1:[252,350], p2:[138,145], p3:[118,68]  }

function cubicBezier(t: number, p0: number[], p1: number[], p2: number[], p3: number[]): [number, number] {
  const mt = 1 - t
  return [
    mt**3*p0[0] + 3*mt**2*t*p1[0] + 3*mt*t**2*p2[0] + t**3*p3[0],
    mt**3*p0[1] + 3*mt**2*t*p1[1] + 3*mt*t**2*p2[1] + t**3*p3[1],
  ]
}

function getDotXY(p: number): [number, number] {
  if (p <= BS_END_P) {
    const s = SEG1
    return cubicBezier(p / BS_END_P, s.p0, s.p1, s.p2, s.p3)
  } else if (p <= IMPACT_P) {
    const s = SEG2
    return cubicBezier((p - BS_END_P) / (IMPACT_P - BS_END_P), s.p0, s.p1, s.p2, s.p3)
  } else {
    const s = SEG3
    return cubicBezier((p - IMPACT_P) / (1 - IMPACT_P), s.p0, s.p1, s.p2, s.p3)
  }
}

// Returns the two adjacent frames with cross-fade opacities for the current progress
function getBlendedFrames(p: number): { key: string; label: string; opacity: number }[] {
  for (let i = 0; i < FRAMES.length - 1; i++) {
    const a = FRAMES[i], b = FRAMES[i + 1]
    if (p >= a.p && p < b.p) {
      const t = (p - a.p) / (b.p - a.p)
      return [
        { key: a.key, label: a.label, opacity: 1 - t },
        { key: b.key, label: b.label, opacity: t },
      ]
    }
  }
  const last = FRAMES[FRAMES.length - 1]
  return [{ key: last.key, label: last.label, opacity: 1 }]
}

function ImpactBurst() {
  return (
    <div className="absolute pointer-events-none" style={{ bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}>
      {[...Array(16)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3,
            height: 48,
            background: 'linear-gradient(to top, #E8C060, transparent)',
            transform: `rotate(${i * 22.5}deg)`,
            transformOrigin: '50% 100%',
            bottom: 0,
            left: '50%',
            marginLeft: -1.5,
            animation: 'burst 0.55s ease-out forwards',
          }}
        />
      ))}
      <div
        className="absolute rounded-full"
        style={{
          width: 60, height: 60,
          background: 'radial-gradient(circle, rgba(201,168,76,0.95) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          animation: 'glow-pulse 0.55s ease-out forwards',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 100, height: 100,
          background: 'radial-gradient(circle, rgba(201,168,76,0.3) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          animation: 'glow-pulse2 0.7s ease-out forwards',
        }}
      />
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

  const dashOffset  = ARC_LENGTH * (1 - Math.min(progress, 1))
  const [dotX, dotY] = progress > 0 && progress < 1 ? getDotXY(progress) : [0, 0]
  const blended     = getBlendedFrames(progress)
  const activeLabel = blended.reduce((a, b) => a.opacity > b.opacity ? a : b).label

  return (
    <>
      <style>{`
        @keyframes burst {
          0%   { opacity: 1; transform: rotate(var(--r)) scaleY(0.1); }
          60%  { opacity: 0.9; }
          100% { opacity: 0; transform: rotate(var(--r)) scaleY(1) translateY(-24px); }
        }
        @keyframes glow-pulse {
          0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; }
        }
        @keyframes glow-pulse2 {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(4);   opacity: 0; }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: #C9A84C;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(201,168,76,0.6);
        }
        input[type=range]::-webkit-slider-runnable-track {
          height: 4px; border-radius: 2px;
        }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: '#080808', color: '#fff' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/swing" className="text-gray-500 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="font-black text-lg" style={{ color: '#C9A84C' }}>TB</span>
            <span className="font-light text-gray-300">TracerBuddy</span>
          </div>
          <div className="flex items-center gap-2 rounded-full px-4 py-1.5 border" style={{ borderColor: '#C9A84C33', background: '#C9A84C11' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C9A84C' }} />
            <span className="text-xs font-bold tracking-widest" style={{ color: '#C9A84C' }}>SWING REPLAY</span>
          </div>
          <button className="text-gray-500 hover:text-white"><MoreHorizontal className="w-5 h-5" /></button>
        </div>

        {/* Main area */}
        <div className="flex flex-1 gap-3 px-5 min-h-0">

          {/* Left metrics */}
          <div className="flex flex-col gap-2.5 w-40 shrink-0">
            {[
              { icon: '◎', label: 'CLUB SPEED',   value: `${m.clubSpeed}`,          unit: 'mph' },
              { icon: '↻', label: 'ATTACK ANGLE', value: `${m.attackAngle}°`,        unit: '' },
              { icon: '∿', label: 'TEMPO RATIO',  value: `${m.tempoRatio}:1`,         unit: '' },
              { icon: '↗', label: 'CLUB PATH',    value: `${Math.abs(m.clubPath)}°`, unit: m.clubPath < 0 ? 'IN→OUT' : 'OUT→IN' },
            ].map(({ icon, label, value, unit }) => (
              <div key={label} className="flex-1 rounded-2xl p-3 flex flex-col justify-between" style={{ background: '#131313', border: '1px solid #222' }}>
                <div style={{ color: '#C9A84C', fontSize: 16 }}>{icon}</div>
                <div>
                  <div className="text-[8px] font-bold tracking-widest mb-1" style={{ color: '#555' }}>{label}</div>
                  <div className="font-black text-2xl leading-none">{value}</div>
                  {unit && <div className="text-[8px] font-bold tracking-wider mt-0.5" style={{ color: '#555' }}>{unit}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Animation canvas */}
          <div className="flex-1 relative rounded-3xl overflow-hidden" style={{ background: '#0C0C0C' }}>

            {/* Ground glow */}
            <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(180,110,20,0.22) 0%, transparent 65%)' }} />

            {/* Animated golfer — single frame cross-fading between keyframes */}
            {FRAMES.map((f) => {
              const frame   = blended.find(b => b.key === f.key)
              const opacity = frame?.opacity ?? 0
              return (
                <img
                  key={f.key}
                  src={`/images/swing/${f.key}.png`}
                  alt={f.label}
                  className="absolute bottom-0 pointer-events-none"
                  style={{
                    opacity,
                    height:      '92%',
                    width:       'auto',
                    maxWidth:    '72%',
                    left:        '50%',
                    transform:   'translateX(-50%)',
                    objectFit:   'contain',
                    objectPosition: 'bottom center',
                    transition:  'opacity 35ms linear',
                    zIndex:      10,
                    display:     opacity < 0.005 ? 'none' : 'block',
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )
            })}

            {/* Position label */}
            <div className="absolute bottom-14 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 20 }}>
              <div className="text-[9px] font-bold tracking-[0.2em] px-3 py-1 rounded-full"
                style={{ color: '#C9A84C', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                {activeLabel.toUpperCase()}
              </div>
            </div>

            {/* Gold arc SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 700 520"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="arcglow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="dotglow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Glow halo */}
              <path d={ARC_PATH} fill="none" stroke="#C9A84C" strokeWidth="12" opacity="0.18"
                filter="url(#arcglow)" strokeLinecap="round"
                strokeDasharray={ARC_LENGTH} strokeDashoffset={dashOffset} />
              {/* Main arc */}
              <path d={ARC_PATH} fill="none" stroke="#C9A84C" strokeWidth="2.5"
                filter="url(#arcglow)" strokeLinecap="round"
                strokeDasharray={ARC_LENGTH} strokeDashoffset={dashOffset} />

              {/* Traveling club-head dot */}
              {progress > 0 && progress < 1 && (
                <>
                  <circle cx={dotX} cy={dotY} r="9" fill="rgba(201,168,76,0.25)" filter="url(#dotglow)" />
                  <circle cx={dotX} cy={dotY} r="5" fill="#E8C060" filter="url(#dotglow)" />
                </>
              )}
            </svg>

            {/* Impact burst */}
            {showImpact && <ImpactBurst />}

            {/* Speed badge */}
            <button
              onClick={cycleSpeed}
              className="absolute bottom-4 right-4 rounded-xl px-3 py-1.5 text-sm font-bold transition-colors"
              style={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
            >
              {speed.toFixed(1)}x
            </button>
          </div>

          {/* Right view buttons */}
          <div className="flex flex-col gap-2.5 w-12 shrink-0">
            {[
              { label: '3D',  active: true },
              { label: '👤', active: false },
              { label: '◎',  active: false },
              { label: '📊', active: false },
            ].map(({ label, active }) => (
              <button
                key={label}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-colors"
                style={{
                  background: active ? 'rgba(201,168,76,0.1)' : '#131313',
                  border: `1px solid ${active ? '#C9A84C' : '#222'}`,
                  color: active ? '#C9A84C' : '#555',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom timeline */}
        <div className="px-5 pt-4 pb-6 shrink-0">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={handlePlay} className="text-white transition-opacity hover:opacity-70">
              {isPlaying
                ? <Pause className="w-6 h-6 fill-white" />
                : <Play  className="w-6 h-6 fill-white" />}
            </button>

            <div className="flex-1">
              <input
                type="range" min="0" max="100"
                value={Math.round(progress * 100)}
                onChange={e => handleScrub(Number(e.target.value) / 100)}
                className="w-full cursor-pointer"
                style={{
                  WebkitAppearance: 'none',
                  height: 4,
                  borderRadius: 2,
                  background: `linear-gradient(to right, #C9A84C ${progress * 100}%, #2a2a2a ${progress * 100}%)`,
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => { setIsPlaying(false); setProgress(0); setImpactFired(false) }}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Phase labels */}
          <div className="flex justify-between px-8">
            <span className="text-[9px] font-bold tracking-widest"
              style={{ color: progress < BS_END_P ? '#C9A84C' : '#444' }}>BACKSWING</span>
            <span className="text-[9px] font-bold tracking-widest"
              style={{ color: progress >= BS_END_P && progress <= IMPACT_P ? '#C9A84C' : '#444' }}>IMPACT</span>
            <span className="text-[9px] font-bold tracking-widest"
              style={{ color: progress > IMPACT_P ? '#C9A84C' : '#444' }}>FOLLOW THROUGH</span>
          </div>
        </div>
      </div>
    </>
  )
}
