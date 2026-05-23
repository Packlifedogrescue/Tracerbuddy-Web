'use client'
import Link from 'next/link'
import Image from 'next/image'
import Reveal from '@/components/Reveal'
import { useState } from 'react'

export default function HomePage() {
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)
  const [waitlistError, setWaitlistError] = useState('')

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setWaitlistSubmitting(true)
    setWaitlistError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail }),
      })
      if (!res.ok) throw new Error()
      setWaitlistDone(true)
    } catch {
      setWaitlistError('Something went wrong. Please try again.')
    } finally {
      setWaitlistSubmitting(false)
    }
  }

  return (
    <div className="bg-[#F5EFE0] text-[#1A1A1A] min-h-screen font-sans">

      {/* ════════════════════════ NAV ════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-[#F5EFE0] border-b border-black/[0.04]">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-[1400px] mx-auto">
          <div className="flex items-center">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-20 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-9">
            <a href="#features" className="text-[14px] text-[#333] hover:text-black transition-colors">Features</a>
            <a href="#how" className="text-[14px] text-[#333] hover:text-black transition-colors">How It Works</a>
            <a href="#watch" className="text-[14px] text-[#333] hover:text-black transition-colors">Apple Watch</a>
            <a href="#pricing" className="text-[14px] text-[#333] hover:text-black transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-[14px] text-[#1A1A1A] hidden md:block hover:text-black transition-colors">Sign In</Link>
            <Link href="/auth/signup" className="text-[14px] font-semibold bg-[#1A1A1A] text-[#F5EFE0] px-5 py-2.5 rounded-full hover:bg-black transition-all hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section className="relative px-6 md:px-12 pt-12 md:pt-20 pb-16 overflow-hidden max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal className="relative z-10">
            <h1 className="font-serif text-[48px] md:text-[76px] font-medium leading-[1.02] tracking-[-0.025em] mb-7">
              Track Every Shot.<br />
              Understand <span className="italic text-[#DF9905]" style={{ fontFeatureSettings: '"ss01"' }}>Every Round.</span>
            </h1>
            <p className="text-[17px] text-[#444] leading-[1.7] max-w-[480px] mb-9">
              Most golfers finish a round with no idea where they lost strokes.
              TracerBuddy shows you exactly — hole by hole, shot by shot — so every
              round makes you a better golfer.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link href="/auth/signup" className="premium-btn-gold">
                Start Free — 2 Rounds
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11L9 7L5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </Link>
              <a href="#features" className="premium-btn-ghost">
                See How It Works
              </a>
            </div>

            {/* Coming soon */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="inline-flex items-center gap-2.5 bg-[#1A1A1A]/[0.06] border border-black/[0.08] px-4 py-2.5 rounded-xl">
                <svg width="18" height="22" viewBox="0 0 18 22" fill="#1A1A1A" opacity="0.5">
                  <path d="M14.94 11.55c-.02-2.16 1.77-3.2 1.85-3.25-1.01-1.48-2.58-1.68-3.14-1.7-1.33-.14-2.6.79-3.28.79-.68 0-1.72-.77-2.83-.75-1.45.02-2.8.85-3.54 2.15-1.52 2.63-.39 6.52 1.08 8.65.73 1.05 1.59 2.22 2.72 2.18 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.69.71 2.84.69 1.18-.02 1.92-1.07 2.63-2.13.84-1.21 1.18-2.4 1.19-2.46-.03-.01-2.36-.9-2.36-3.46zM12.68 4.5c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.54 1.3-.56.64-1.05 1.67-.87 2.65.97.07 1.95-.49 2.51-1.2z"/>
                </svg>
                <div>
                  <div className="text-[9px] leading-none text-[#999] mb-0.5">Coming soon to the</div>
                  <div className="text-[14px] font-semibold leading-none text-[#555]">App Store</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 text-[12px] text-[#888]">
              <div className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7L5.5 9.5L10 4" stroke="#0A8F4F" strokeWidth="2" strokeLinecap="round"/></svg>
                2 rounds free
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7L5.5 9.5L10 4" stroke="#0A8F4F" strokeWidth="2" strokeLinecap="round"/></svg>
                No credit card
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7L5.5 9.5L10 4" stroke="#0A8F4F" strokeWidth="2" strokeLinecap="round"/></svg>
                Cancel anytime
              </div>
            </div>
          </Reveal>

          <Reveal delay={200} className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(223,153,5,0.18) 0%, rgba(223,153,5,0.05) 40%, transparent 70%)' }} />
            </div>
            <Image
              src="/images/hero-phone.png"
              alt="TracerBuddy app on iPhone"
              width={1024} height={1536}
              className="relative max-h-[620px] w-auto drop-shadow-[0_40px_80px_rgba(26,26,26,0.2)]"
              priority
            />
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════ WAITLIST ════════════════════════ */}
      <section className="px-6 md:px-12 pb-12 max-w-[1400px] mx-auto">
        <Reveal>
          <div className="bg-gradient-to-br from-[#EFE7D4] to-[#E5DBC2] rounded-3xl px-8 md:px-16 py-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(223,153,5,0.2) 0%, transparent 60%)' }} />
            <div className="relative z-10 max-w-[540px] mx-auto">
              <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-4">APP STORE — COMING SOON</div>
              <h2 className="font-serif text-3xl md:text-[42px] font-medium tracking-[-0.02em] leading-[1.1] mb-4">
                Be first when we launch<br className="hidden md:block" /> on the App Store.
              </h2>
              <p className="text-[15px] text-[#666] leading-[1.65] mb-8">
                Drop your email and we'll notify you the moment TracerBuddy is live on iOS — plus early access and a free extended trial.
              </p>
              {waitlistDone ? (
                <div className="inline-flex items-center gap-3 bg-[#0A8F4F]/10 border border-[#0A8F4F]/20 text-[#0A8F4F] px-6 py-3.5 rounded-xl font-semibold text-[15px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9L7.5 12.5L14 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                  You&apos;re on the list — we&apos;ll be in touch!
                </div>
              ) : (
                <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-[420px] mx-auto">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={e => setWaitlistEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    className="flex-1 bg-white border border-black/10 rounded-full px-5 py-3.5 text-[15px] text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-[#1A1A1A] transition"
                  />
                  <button
                    type="submit"
                    disabled={waitlistSubmitting}
                    className="bg-[#1A1A1A] text-[#F5EFE0] font-semibold px-7 py-3.5 rounded-full text-[15px] hover:bg-black transition hover:-translate-y-0.5 disabled:opacity-50 shrink-0"
                  >
                    {waitlistSubmitting ? 'Saving…' : 'Notify Me'}
                  </button>
                </form>
              )}
              {waitlistError && <p className="text-red-500 text-[13px] mt-3">{waitlistError}</p>}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════ TRUST BAR ════════════════════════ */}
      <section className="px-6 md:px-12 pb-12 max-w-[1400px] mx-auto">
        <Reveal>
          <div className="border-y border-black/[0.06] py-7">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { stat: '42,000+', label: 'Courses',          sub: 'in 100+ countries'      },
                { stat: '18',      label: 'Metrics Per Round', sub: 'GIR, putts, SG & more' },
                { stat: '50+',     label: 'Features',          sub: 'across 6 categories'   },
                { stat: '2',       label: 'Rounds Free',       sub: 'no credit card needed'  },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-serif text-[32px] md:text-[40px] font-medium text-[#1A1A1A] leading-none">{s.stat}</div>
                  <div className="text-[12px] font-semibold text-[#1A1A1A] mt-2 tracking-wide">{s.label}</div>
                  <div className="text-[11px] text-[#888] mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════ HOW IT WORKS ════════════════════════ */}
      <section id="how" className="px-6 md:px-12 py-16 md:py-20 max-w-[1400px] mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-4">HOW IT WORKS</div>
            <h2 className="font-serif text-3xl md:text-[48px] font-medium tracking-[-0.02em] leading-[1.1]">
              Better data.<br />Better decisions. <span className="italic">Better golf.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-10 md:gap-6 max-w-5xl mx-auto relative">
          <div className="hidden md:block absolute top-7 left-[18%] right-[18%] h-px border-t border-dashed border-black/15" />
          {[
            { num: '01', title: 'Track your round', desc: 'Open the app at the first tee. Shots, clubs, and distances are captured automatically as you play.' },
            { num: '02', title: 'Review every miss', desc: 'After the round, see exactly where you lost strokes — and the patterns behind them.' },
            { num: '03', title: 'Improve faster', desc: 'AI coach cards turn raw data into a personalized plan for your next session.' },
          ].map((step, i) => (
            <Reveal key={step.num} delay={i * 100}>
              <div className="text-center relative">
                <div className="w-14 h-14 rounded-full bg-[#1A1A1A] text-[#F5EFE0] flex items-center justify-center font-serif font-medium text-[18px] mx-auto mb-6 relative z-10 shadow-lg">
                  {step.num}
                </div>
                <h3 className="font-bold text-[17px] mb-2.5 text-[#1A1A1A]">{step.title}</h3>
                <p className="text-[13.5px] text-[#666] leading-[1.65] max-w-[260px] mx-auto">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════════════════════════ FEATURE GRID ════════════════════════ */}
      <section id="features" className="px-6 md:px-12 pb-20 max-w-[1400px] mx-auto">
        <Reveal>
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-4">BUILT FOR PERFORMANCE</div>
            <h2 className="font-serif text-3xl md:text-[48px] font-medium tracking-[-0.02em] leading-[1.1]">
              The complete performance<br />system for serious golfers.
            </h2>
            <p className="text-[14.5px] text-[#666] mt-5 max-w-[520px] mx-auto leading-[1.65]">
              50+ features across every part of your game — from the first tee to the post-round debrief.
            </p>
          </div>
        </Reveal>

        {/* Quick-glance feature strip */}
        <Reveal>
          <div className="flex flex-wrap justify-center gap-2.5 mb-12">
            {[
              'Digital Scorecards', 'Shot Tracking', 'Satellite Maps', 'Apple Watch',
              'Strokes Gained', 'Club Distances', 'AI Coach Cards', 'Putting Stats',
              'Match Play', 'Stableford', 'Practice Mode', 'Buddy Battles',
            ].map(tag => (
              <span key={tag} className="text-[12.5px] text-[#555] bg-white/70 border border-black/[0.06] px-3.5 py-1.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-px bg-black/[0.06] rounded-2xl overflow-hidden border border-black/[0.06]">
          {[
            {
              num: '01', label: 'SCORING & ROUNDS',
              title: 'Digital Scorecards',
              desc: 'Stroke play, stableford, match play, skins, best ball — every format covered.',
              features: ['Auto-fill par & handicap', 'Stableford & match play', 'Skins & best ball modes', 'Round history per course', 'Export PDF scorecards'],
            },
            {
              num: '02', label: 'SHOT TRACKING',
              title: 'Precision Shot Tracking',
              desc: 'GPS accuracy on every shot. Distance, club, landing position — all automatic.',
              features: ['GPS shot detection', 'Club selection per shot', 'Miss direction tracking', 'Fairway & GIR tracking', 'Shot-by-shot replay'],
            },
            {
              num: '03', label: 'COURSE MAPS',
              title: 'Satellite Course Maps',
              desc: 'Real aerial imagery with live GPS distances, hazards, and weather at your course.',
              features: ['Satellite aerial imagery', 'Live distance to pin', 'Hazard & layup yardages', 'Wind & weather overlay', '42,000+ courses worldwide'],
            },
            {
              num: '04', label: 'PERFORMANCE INSIGHTS',
              title: 'Stats That Move the Needle',
              desc: 'The numbers that actually tell you where you\'re losing strokes every round.',
              features: ['Strokes gained breakdown', 'GIR % and fairway %', 'Putting averages', '3-putt & 1-putt rates', 'Club Confidence™ distances'],
            },
            {
              num: '05', label: 'AI COACH',
              title: 'AI Coach Cards',
              desc: 'After every round: your biggest leak, club report, and a custom practice plan.',
              features: ['Post-round AI analysis', 'Biggest strokes-lost leak', 'Club misfiring detection', 'Putting miss pattern ID', 'Goal & handicap tracking'],
            },
            {
              num: '06', label: 'SOCIAL & COMPETITION',
              title: 'Buddy Battles',
              desc: 'Head-to-head match play, tournaments, and a full leaderboard against your group.',
              features: ['Buddy Battles head-to-head', 'Match play W/L record', 'Stableford tournaments', 'Group leaderboard', 'Round share & compare'],
            },
          ].map((cat, i) => (
            <Reveal key={cat.num} delay={i * 60}>
              <div className="group h-full bg-[#F5EFE0] hover:bg-white transition-colors duration-300 p-7 md:p-8">
                <div className="flex items-start justify-between mb-5">
                  <span className="font-serif text-[42px] font-medium text-black/[0.07] leading-none select-none">{cat.num}</span>
                  <span className="text-[10px] font-bold tracking-[0.18em] text-[#DF9905] mt-1">{cat.label}</span>
                </div>
                <h3 className="text-[17px] font-bold text-[#1A1A1A] mb-2 leading-snug">{cat.title}</h3>
                <p className="text-[13px] text-[#777] leading-[1.6] mb-5">{cat.desc}</p>
                <ul className="space-y-2">
                  {cat.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-[12.5px] text-[#444]">
                      <span className="w-1 h-1 rounded-full bg-[#DF9905] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Apple Watch feature highlight */}
        <Reveal delay={100}>
          <div className="mt-5 bg-[#1A1A1A] text-[#F5EFE0] rounded-2xl p-7 md:p-10 grid md:grid-cols-2 gap-8 items-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #F5EFE0 1px, transparent 0)', backgroundSize: '28px 28px' }} />
            <div className="relative z-10">
              <div className="text-[10px] font-bold text-[#DF9905] tracking-[0.25em] mb-3">APPLE WATCH · SWINGTRACE</div>
              <h3 className="font-serif text-[28px] md:text-[36px] font-medium leading-[1.1] tracking-[-0.02em] mb-4">
                Your wrist knows<br />your swing better<br className="hidden md:block"/> than you do.
              </h3>
              <p className="text-[13.5px] text-[#aaa] leading-[1.65] max-w-[380px]">
                Wear your Apple Watch on the course and every swing is captured automatically — speed, tempo, backswing duration, and miss patterns, all without touching your phone.
              </p>
            </div>
            <div className="relative z-10 grid grid-cols-3 gap-3">
              {[
                { label: 'Swing Speed', value: '94', unit: 'MPH' },
                { label: 'Tempo',       value: '3:1', unit: 'RATIO' },
                { label: 'Backswing',   value: '0.9', unit: 'SEC' },
                { label: 'Driver Avg',  value: '89', unit: 'MPH' },
                { label: 'Swings',      value: '847', unit: 'LOGGED' },
                { label: 'Last Round',  value: '+4', unit: 'MPH' },
              ].map(m => (
                <div key={m.label} className="text-center bg-white/[0.05] border border-white/[0.07] rounded-xl p-3.5">
                  <div className="text-[9px] text-[#777] mb-1.5 tracking-wide font-semibold">{m.label}</div>
                  <div className="font-serif text-[24px] font-medium text-[#F5EFE0] leading-none">{m.value}</div>
                  <div className="text-[9px] text-[#666] mt-1.5 tracking-wider font-bold">{m.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════ iPHONE + APPLE WATCH ════════════════════════ */}
      <section id="watch" className="px-6 md:px-12 pb-8 max-w-[1400px] mx-auto">
        <Reveal>
          <div className="bg-gradient-to-br from-[#EFE7D4] via-[#EFE7D4] to-[#E5DBC2] rounded-3xl px-8 md:px-16 pt-14 pb-0 overflow-hidden relative">
            {/* Decorative gradient orb */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(223,153,5,0.12) 0%, transparent 60%)' }} />
            <div className="relative z-10 grid md:grid-cols-5 gap-10 items-end">
              <div className="md:col-span-2 pb-14">
                <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-5">iPHONE + APPLE WATCH</div>
                <h2 className="font-serif text-3xl md:text-[44px] font-medium leading-[1.1] tracking-[-0.02em] mb-8">
                  Everything you need.<br />Right on your wrist.
                </h2>
                <div className="space-y-3.5">
                  {[
                    'Auto shot detection from your Apple Watch',
                    'Live distances and hole maps as you play',
                    'Swing speed, tempo, and motion analytics',
                    'Syncs seamlessly between iPhone and Watch',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#DF9905] flex items-center justify-center flex-shrink-0">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                      </div>
                      <span className="text-[14.5px] text-[#1A1A1A]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3 flex justify-center items-end">
                <Image src="/images/watch-section.png" alt="iPhone and Apple Watch" width={1448} height={1086} className="w-full h-auto scale-[1.08] origin-bottom" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════ SWINGTRACE PREVIEW ════════════════════════ */}
      <section className="px-4 md:px-12 pb-8 max-w-[1400px] mx-auto">
        <Reveal>
          <div className="bg-[#0D2818] text-[#F5EFE0] rounded-3xl overflow-hidden relative">
            <div className="grid md:grid-cols-12 gap-6 md:gap-8 px-6 md:px-16 pt-10 md:pt-14 pb-10 md:pb-14 items-center">
              {/* Text */}
              <div className="md:col-span-4 relative z-10">
                <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-4 md:mb-5">SWINGTRACE</div>
                <h2 className="font-serif text-[26px] md:text-[36px] font-medium leading-[1.1] tracking-[-0.02em] mb-3 md:mb-4">
                  See your swing.<br />Fix what's broken.
                </h2>
                <p className="text-[13px] md:text-[14px] text-[#aaa] leading-[1.65]">
                  Apple Watch motion sensors capture every detail — so you can stop guessing what's wrong with your swing.
                </p>
              </div>
              {/* Stats */}
              <div className="md:col-span-8 grid grid-cols-3 gap-2.5 md:gap-4 relative z-10">
                {[
                  { label: 'Swing\nSpeed', value: '85', unit: 'MPH', tag: null },
                  { label: 'Tempo', value: '3:1:1', unit: '', tag: 'Optimal' },
                  { label: 'Backswing', value: '0.92', unit: 'SEC', tag: null },
                ].map(m => (
                  <div key={m.label} className="text-center bg-white/[0.04] backdrop-blur border border-white/[0.06] rounded-2xl p-3 md:p-5">
                    <div className="text-[9px] md:text-[11px] font-semibold text-[#888] mb-2 tracking-wide whitespace-pre-line leading-tight">{m.label}</div>
                    <div className="font-serif text-[28px] md:text-[44px] font-medium text-[#F5EFE0] leading-none">{m.value}</div>
                    {m.unit && <div className="text-[9px] md:text-[10px] text-[#777] font-semibold mt-1.5 md:mt-2 tracking-wider">{m.unit}</div>}
                    {m.tag && <span className="inline-block text-[9px] md:text-[10px] text-[#0A8F4F] bg-[#0A8F4F]/15 px-2 py-0.5 rounded-full mt-1.5 md:mt-2 font-semibold">{m.tag}</span>}
                    <svg width="100%" height="16" viewBox="0 0 100 20" className="mt-2 md:mt-3"><path d="M0,12 Q15,4 30,10 T60,6 T90,8 T100,5" stroke="#DF9905" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7"/></svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════ PRICING ════════════════════════ */}
      <section id="pricing" className="px-6 md:px-12 py-20 max-w-[1400px] mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-4">PRICING</div>
            <h2 className="font-serif text-3xl md:text-[48px] font-medium tracking-[-0.02em] leading-[1.1] mb-4">
              Invest in your game.
            </h2>
            <p className="text-[14.5px] text-[#666] max-w-[460px] mx-auto leading-[1.6]">
              Full access from day one. No tiers, no add-ons, no hidden fees.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <Reveal delay={50}>
            <div className="h-full bg-white border border-black/[0.05] rounded-2xl p-8 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-shadow">
              <div className="text-[13px] font-bold text-[#1A1A1A] mb-3 tracking-wide">MONTHLY</div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-serif text-[48px] font-medium text-[#1A1A1A] leading-none">$24.99</span>
                <span className="text-[14px] text-[#888]">/ month</span>
              </div>
              <p className="text-[13px] text-[#888] mb-6">First 2 rounds free, then $24.99/mo</p>
              <div className="space-y-3 mb-8">
                {['Full app access on iOS + Web', 'Apple Watch SwingTrace', 'AI Coach Cards every round', 'Cancel anytime'].map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-1 flex-shrink-0"><path d="M3 7L5.5 9.5L10 4" stroke="#0A8F4F" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span className="text-[13.5px] text-[#333]">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/signup" className="premium-btn-ghost w-full">Try Free — 2 Rounds</Link>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="h-full bg-[#1A1A1A] text-[#F5EFE0] rounded-2xl p-8 relative shadow-[0_20px_60px_rgba(223,153,5,0.18)] border border-[#DF9905]/40">
              <div className="absolute -top-3 right-6 bg-[#DF9905] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-[0.15em]">SAVE $99</div>
              <div className="text-[13px] font-bold text-[#DF9905] mb-3 tracking-wide">YEARLY</div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-serif text-[48px] font-medium leading-none">$199.99</span>
                <span className="text-[14px] text-[#888]">/ year</span>
              </div>
              <p className="text-[13px] text-[#888] mb-6">Just $16.67/month, billed annually</p>
              <div className="space-y-3 mb-8">
                {['Everything in Monthly', 'Priority support', 'Early access to new features', 'Tournament & match-play modes'].map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-1 flex-shrink-0"><path d="M3 7L5.5 9.5L10 4" stroke="#DF9905" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span className="text-[13.5px] text-[#ddd]">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/signup" className="premium-btn-gold w-full">Try Free — 2 Rounds</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════ CTA BANNER ════════════════════════ */}
      <section className="px-6 md:px-12 py-14 max-w-[1400px] mx-auto">
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden bg-[#1A1A1A]">
            <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(223,153,5,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(10,143,79,0.2) 0%, transparent 50%)' }} />
            <div className="relative z-10 px-8 md:px-16 py-14 md:py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <h3 className="font-serif text-white text-3xl md:text-[44px] font-medium leading-[1.1] tracking-[-0.02em] max-w-[500px]">
                  Every round should<br />make you <span className="italic text-[#DF9905]">better.</span>
                </h3>
                <p className="text-[14.5px] text-[#aaa] mt-4 max-w-[460px]">Start free. Play two full rounds on us. No credit card required.</p>
              </div>
              <Link href="/auth/signup" className="premium-btn-gold shrink-0">
                Start Free — 2 Rounds
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11L9 7L5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════ FOOTER ════════════════════════ */}
      <footer className="px-6 md:px-12 pt-16 pb-10 max-w-[1400px] mx-auto border-t border-black/[0.06] mt-8">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-1">
            <div className="mb-4">
              <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-14 w-auto" />
            </div>
            <p className="text-[13px] text-[#666] leading-[1.6] max-w-[240px]">Premium shot tracking and round insights for serious golfers.</p>
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#1A1A1A] mb-4 tracking-wider">PRODUCT</div>
            <div className="space-y-2.5 text-[13px] text-[#666]">
              <a href="#features" className="block hover:text-black transition-colors">Features</a>
              <a href="#how" className="block hover:text-black transition-colors">How It Works</a>
              <a href="#watch" className="block hover:text-black transition-colors">Apple Watch</a>
              <a href="#pricing" className="block hover:text-black transition-colors">Pricing</a>
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#1A1A1A] mb-4 tracking-wider">COMPANY</div>
            <div className="space-y-2.5 text-[13px] text-[#666]">
              <Link href="/about" className="block hover:text-black transition-colors">About</Link>
              <Link href="/contact" className="block hover:text-black transition-colors">Contact</Link>
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#1A1A1A] mb-4 tracking-wider">LEGAL</div>
            <div className="space-y-2.5 text-[13px] text-[#666]">
              <Link href="/privacy" className="block hover:text-black transition-colors">Privacy</Link>
              <Link href="/terms" className="block hover:text-black transition-colors">Terms</Link>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-black/[0.06]">
          <div className="text-[12px] text-[#888]">© 2026 TracerBuddy. All rights reserved.</div>
          <div className="text-[12px] text-[#888]">Made for golfers who play to improve.</div>
        </div>
      </footer>
    </div>
  )
}
