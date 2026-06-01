'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Play, Pause, ChevronLeft, ChevronRight, MoreHorizontal, Zap, RotateCcw, Activity, TrendingUp } from 'lucide-react'

const MOCK_METRICS = {
  clubSpeed:        94.0,
  attackAngle:      -3.2,
  tempoRatio:       3.1,
  clubPath:         -1.4,
  backswingMs:      800,
  downswingMs:      260,
}

const FRAMES = [
  { key: 'swing_address',       label: 'Address',     p: 0.00 },
  { key: 'swing_halfway_back',  label: 'Halfway',     p: 0.20 },
  { key: 'swing_top',           label: 'Top',         p: 0.40 },
  { key: 'swing_downswing',     label: 'Downswing',   p: 0.62 },
  { key: 'swing_impact',        label: 'Impact',      p: 0.75 },
  { key: 'swing_finish',        label: 'Finish',      p: 1.00 },
]

// Gold arc traces club head path: address(bottom-left) → top-of-backswing → impact(bottom-center) → finish(top-right)
const ARC_PATH = 'M 105 475 C 155 420, 185 350, 215 300 C 260 230, 290 110, 325 60 C 362 105, 392 200, 418 255 C 455 330, 492 425, 525 468 C 558 390, 592 220, 628 78'
const ARC_LENGTH = 950

function ImpactBurst() {
  return (
    <div className="absolute pointer-events-none" style={{ bottom: '26%', left: '51%', transform: 'translateX(-50%)' }}>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3,
            height: Math.random() * 40 + 20,
            background: 'linear-gradient(to top, #C9A84C, transparent)',
            transform: `rotate(${i * 30}deg)`,
            transformOrigin: '50% 100%',
            bottom: 0,
            left: '50%',
            marginLeft: -1.5,
            animation: 'burst 0.5s ease-out forwards',
          }}
        />
      ))}
      <div
        className="absolute rounded-full"
        style={{
          width: 40, height: 40,
          background: 'radial-gradient(circle, rgba(201,168,76,0.9) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          animation: 'glow-pulse 0.5s ease-out forwards',
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
  const rafRef       = useRef<number | null>(null)
  const startRef     = useRef<number>(0)
  const startPRef    = useRef<number>(0)
  const m            = MOCK_METRICS
  const totalMs      = (m.backswingMs + m.downswingMs) / speed

  const stopAnim = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  useEffect(() => {
    if (!isPlaying) { stopAnim(); return }
    startRef.current  = performance.now()
    startPRef.current = progress >= 1 ? 0 : progress

    const tick = (now: number) => {
      const elapsed  = now - startRef.current
      const newP     = Math.min(startPRef.current + elapsed / totalMs, 1)
      setProgress(newP)
      if (newP >= 0.73 && newP < 0.78 && !impactFired) {
        setShowImpact(true)
        setImpactFired(true)
        setTimeout(() => setShowImpact(false), 600)
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
    if (progress >= 1) { setProgress(0); setImpactFired(false) }
    setIsPlaying(p => !p)
  }

  const handleScrub = (v: number) => {
    stopAnim()
    setIsPlaying(false)
    setProgress(v)
  }

  const cycleSpeed = () => setSpeed(s => s === 0.5 ? 1.0 : s === 1.0 ? 2.0 : 0.5)

  const frameOpacity = (fp: number) => {
    const d = Math.abs(progress - fp)
    if (d < 0.12) return 1.0
    if (d < 0.35) return 0.7
    return 0.45
  }

  const dashOffset = ARC_LENGTH * (1 - Math.min(progress, 1))

  // Dot position along the arc (approx)
  const dotProgress = Math.min(progress, 1)
  const dotX = 95  + (610 - 95)  * dotProgress
  const dotY = 55  + (200 - 55)  * Math.sin(dotProgress * Math.PI) * -1 + (200 - 55) * dotProgress * 0.8

  return (
    <>
      <style>{`
        @keyframes burst {
          0%   { opacity: 1; transform: rotate(var(--r)) scaleY(0.2); }
          60%  { opacity: 0.8; }
          100% { opacity: 0; transform: rotate(var(--r)) scaleY(1) translateY(-20px); }
        }
        @keyframes glow-pulse {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(3);   opacity: 0; }
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
              { icon: '◎', label: 'CLUB SPEED',    value: `${m.clubSpeed}`, unit: 'mph' },
              { icon: '↻', label: 'ATTACK ANGLE',  value: `${m.attackAngle}°`, unit: '' },
              { icon: '∿', label: 'TEMPO RATIO',   value: `${m.tempoRatio}:1`, unit: '' },
              { icon: '↗', label: 'CLUB PATH',     value: `${Math.abs(m.clubPath)}°`, unit: m.clubPath < 0 ? 'IN→OUT' : 'OUT→IN' },
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

            {/* Ambient ground glow */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />

            {/* Golfer frames */}
            <div className="absolute inset-0">
              {FRAMES.map((f, i) => (
                <div
                  key={f.key}
                  className="absolute bottom-0 transition-opacity"
                  style={{
                    opacity:    frameOpacity(f.p),
                    left:       `${2 + i * 15}%`,
                    height:     '100%',
                    width:      '20%',
                    transitionDuration: '80ms',
                    zIndex: 5 + i,
                  }}
                >
                  <img
                    src={`/images/swing/${f.key}.png`}
                    alt={f.label}
                    className="h-full w-full object-contain object-bottom"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement
                      el.style.display = 'none'
                    }}
                  />
                </div>
              ))}
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
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Glow layer */}
              <path
                d={ARC_PATH}
                fill="none"
                stroke="#C9A84C"
                strokeWidth="10"
                opacity="0.25"
                filter="url(#arcglow)"
                strokeLinecap="round"
                strokeDasharray={ARC_LENGTH}
                strokeDashoffset={dashOffset}
              />
              {/* Main line */}
              <path
                d={ARC_PATH}
                fill="none"
                stroke="#C9A84C"
                strokeWidth="2.5"
                filter="url(#arcglow)"
                strokeLinecap="round"
                strokeDasharray={ARC_LENGTH}
                strokeDashoffset={dashOffset}
              />

              {/* Traveling dot */}
              {progress > 0 && progress < 1 && (
                <circle
                  cx={dotX}
                  cy={dotY}
                  r="6"
                  fill="#C9A84C"
                  filter="url(#dotglow)"
                />
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

          {/* Right buttons */}
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

            <button onClick={() => { setIsPlaying(false); setProgress(0); setImpactFired(false) }}
              className="text-gray-500 hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-between px-8">
            <span className="text-[9px] font-bold tracking-widest" style={{ color: '#444' }}>BACKSWING</span>
            <span className="text-[9px] font-bold tracking-widest" style={{ color: progress >= 0.65 && progress <= 0.85 ? '#C9A84C' : '#444' }}>IMPACT</span>
            <span className="text-[9px] font-bold tracking-widest" style={{ color: '#444' }}>FOLLOW THROUGH</span>
          </div>
        </div>
      </div>
    </>
  )
}
