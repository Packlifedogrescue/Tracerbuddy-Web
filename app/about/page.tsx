import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — TracerBuddy',
  description: 'TracerBuddy brings tour-level performance analytics to every golfer.',
}

export default function AboutPage() {
  return (
    <div className="bg-[#F5EFE0] text-[#1A1A1A] min-h-screen font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F5EFE0] border-b border-black/[0.04]">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-[1400px] mx-auto">
          <Link href="/" className="flex items-center">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-16 w-auto mix-blend-multiply" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-[14px] text-[#1A1A1A] hidden md:block hover:text-black transition-colors">Sign In</Link>
            <Link href="/auth/signup" className="text-[14px] font-semibold bg-[#1A1A1A] text-[#F5EFE0] px-5 py-2.5 rounded-full hover:bg-black transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-16 max-w-[1000px] mx-auto">
        <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-6">ABOUT TRACERBUDDY</div>
        <h1 className="font-serif text-[44px] md:text-[72px] font-medium tracking-[-0.025em] leading-[1.03] mb-8">
          The gap between a tour pro<br className="hidden md:block" />
          and a weekend golfer isn't<br className="hidden md:block" />
          talent. <span className="italic text-[#DF9905]">It's information.</span>
        </h1>
        <p className="text-[17px] text-[#555] leading-[1.75] max-w-[600px]">
          Tour players know exactly where every shot went, why they made bogey, and what to work on before the next round. Most golfers go home with nothing but a scorecard. We built TracerBuddy to close that gap.
        </p>
      </section>

      {/* Dark mission block */}
      <section className="px-6 md:px-12 pb-8 max-w-[1000px] mx-auto">
        <div className="bg-[#1A1A1A] rounded-3xl p-8 md:p-14 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(223,153,5,0.15) 0%, transparent 55%), radial-gradient(ellipse at 100% 0%, rgba(223,153,5,0.08) 0%, transparent 50%)' }} />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #F5EFE0 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="relative z-10 max-w-[680px]">
            <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-6">THE PROBLEM</div>
            <p className="font-serif text-[24px] md:text-[32px] font-medium text-[#F5EFE0] leading-[1.35] tracking-[-0.01em]">
              The average golfer plays 25 rounds a year and never meaningfully improves — not because they don't practice, but because they're practicing the wrong things.
            </p>
            <p className="text-[15px] text-[#888] leading-[1.75] mt-6">
              Without data, every round is just a feeling. You think your driver is the problem. The numbers say it's your wedge game. You spend six months on the range fixing the wrong thing. TracerBuddy ends that cycle.
            </p>
          </div>
        </div>
      </section>

      {/* What we built */}
      <section className="px-6 md:px-12 py-8 max-w-[1000px] mx-auto">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-3xl border border-black/[0.05] p-8 md:p-10">
            <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-6">WHAT WE BUILT</div>
            <h2 className="font-serif text-[28px] md:text-[34px] font-medium tracking-[-0.02em] leading-[1.15] mb-5">
              Tour-grade analytics.<br />First-tee simplicity.
            </h2>
            <p className="text-[14.5px] text-[#555] leading-[1.75]">
              We took the tools that elite coaches use — strokes gained, shot dispersion, club distance mapping — and rebuilt them into something you can open on the 1st tee without reading a manual.
            </p>
            <p className="text-[14.5px] text-[#555] leading-[1.75] mt-4">
              Every round you play feeds into your profile. Every missed fairway, three-putt, and chunked chip gets logged, analyzed, and turned into a coaching card that tells you exactly what to fix.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <div className="bg-[#F5EFE0] rounded-3xl border border-black/[0.05] p-8 flex-1">
              <div className="font-serif text-[48px] font-medium text-[#DF9905] leading-none mb-3">42,000<span className="text-[32px]">+</span></div>
              <div className="text-[15px] font-bold text-[#1A1A1A] mb-1">Courses worldwide</div>
              <div className="text-[13.5px] text-[#777] leading-[1.6]">GPS satellite maps for every course in 100+ countries. Search your home track and be on the map in seconds.</div>
            </div>
            <div className="bg-[#F5EFE0] rounded-3xl border border-black/[0.05] p-8 flex-1">
              <div className="font-serif text-[48px] font-medium text-[#1A1A1A] leading-none mb-3">50<span className="text-[32px]">+</span></div>
              <div className="text-[15px] font-bold text-[#1A1A1A] mb-1">Features at launch</div>
              <div className="text-[13.5px] text-[#777] leading-[1.6]">Shot tracking, swing data, AI coach cards, club fitting, tournaments, Buddy Battles — the complete system.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Apple Watch callout */}
      <section className="px-6 md:px-12 py-8 max-w-[1000px] mx-auto">
        <div className="bg-[#1A1A1A] rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-10 items-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 50%, rgba(223,153,5,0.25) 0%, transparent 50%)' }} />
          <div className="relative z-10">
            <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-5">APPLE WATCH</div>
            <h2 className="font-serif text-[28px] md:text-[36px] font-medium text-[#F5EFE0] leading-[1.15] tracking-[-0.02em] mb-5">
              The only golf app<br />that knows your swing.
            </h2>
            <p className="text-[14.5px] text-[#999] leading-[1.75]">
              Our Apple Watch integration captures swing speed, tempo, and motion data on every shot — automatically, without touching your phone. No launch monitor required.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3">
            {[
              { label: 'Swing Speed',  value: '94 mph'  },
              { label: 'Tempo',        value: '3:1'     },
              { label: 'Driver Avg',   value: '89 mph'  },
              { label: 'Swings Logged',value: '847'     },
            ].map(m => (
              <div key={m.label} className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 text-center">
                <div className="text-[10px] text-[#666] mb-2 tracking-wide font-semibold">{m.label}</div>
                <div className="font-serif text-[22px] font-medium text-[#F5EFE0] leading-none">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="px-6 md:px-12 py-8 max-w-[1000px] mx-auto">
        <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-8">HOW WE WORK</div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              title: 'Honest analytics',
              desc: "We show you what the data says, even when it's uncomfortable. No flattering your handicap. Just the truth about your game.",
            },
            {
              title: 'Simple by design',
              desc: "Powerful features that disappear into the round. You shouldn't be thinking about the app on the 14th fairway — just playing golf.",
            },
            {
              title: 'Your data, always',
              desc: "We don't sell your round data, share it with third parties, or use it to train models. What happens on the course stays in your account.",
            },
          ].map((p, i) => (
            <div key={p.title} className="bg-white rounded-2xl border border-black/[0.05] p-7">
              <div className="font-serif text-[44px] font-medium text-black/[0.06] leading-none mb-5">0{i + 1}</div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-2.5">{p.title}</h3>
              <p className="text-[13.5px] text-[#666] leading-[1.7]">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-16 max-w-[1000px] mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-[#1A1A1A]">
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(223,153,5,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(10,143,79,0.2) 0%, transparent 50%)' }} />
          <div className="relative z-10 px-8 md:px-14 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <h2 className="font-serif text-white text-[28px] md:text-[40px] font-medium leading-[1.1] tracking-[-0.02em]">
                Play smarter.<br />Score lower.
              </h2>
              <p className="text-[14.5px] text-[#888] mt-3 max-w-[400px]">Start free — 1 round free, no credit card required.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href="/auth/signup" className="premium-btn-gold">
                Get Started Free
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11L9 7L5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </Link>
              <Link href="/contact" className="premium-btn-ghost">
                Talk to Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-10 max-w-[1400px] mx-auto border-t border-black/[0.06]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[12px] text-[#888]">© 2026 TracerBuddy LLC. All rights reserved.</div>
          <div className="flex items-center gap-6 text-[12px] text-[#888]">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/disclaimer" className="hover:text-black transition-colors">Disclaimer</Link>
            <Link href="/about" className="hover:text-black transition-colors">About</Link>
            <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
