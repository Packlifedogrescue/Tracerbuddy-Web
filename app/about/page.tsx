import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — TracerBuddy',
  description: 'The story behind TracerBuddy — built by golfers, for golfers who play to improve.',
}

export default function AboutPage() {
  return (
    <div className="bg-[#F5EFE0] text-[#1A1A1A] min-h-screen font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F5EFE0] border-b border-black/[0.04]">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-[1400px] mx-auto">
          <Link href="/" className="flex items-center">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-9 w-auto" />
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
      <section className="px-6 md:px-12 pt-16 pb-12 max-w-[860px] mx-auto">
        <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-4">OUR STORY</div>
        <h1 className="font-serif text-[40px] md:text-[64px] font-medium tracking-[-0.025em] leading-[1.05] mb-6">
          Built by golfers.<br />For golfers who<br />
          <span className="italic text-[#DF9905]">play to improve.</span>
        </h1>
        <p className="text-[17px] text-[#555] leading-[1.75] max-w-[580px]">
          Most golfers finish 18 holes with a scorecard and a feeling. TracerBuddy exists to give you the third thing — the data that actually explains the round.
        </p>
      </section>

      {/* Origin story */}
      <section className="px-6 md:px-12 pb-16 max-w-[860px] mx-auto">
        <div className="bg-white rounded-3xl border border-black/[0.05] p-8 md:p-12">
          <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-5">THE ORIGIN</div>
          <div className="space-y-5 text-[15px] text-[#444] leading-[1.8]">
            <p>
              TracerBuddy started on a Sunday afternoon after a particularly frustrating round. Shot 84. Felt like 78. No idea why. The scorecard said 5 bogeys but couldn't tell us whether the problem was off the tee, the approach, or the putter.
            </p>
            <p>
              Every golf app at the time tracked <em>what</em> happened — score, par, handicap. None of them told us <em>why</em>. We wanted something that could look at a round and say: "Your 7-iron is 12 yards shorter than you think, and it's costing you two shots a round."
            </p>
            <p>
              So we built it. Starting with shot tracking and GPS maps, then layering in Apple Watch swing data, AI coaching, and the full stat suite that tour players use — but made simple enough to use on the 1st tee without a tutorial.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 md:px-12 pb-16 max-w-[860px] mx-auto">
        <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-8">WHAT WE BELIEVE</div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              num: '01',
              title: 'Data without jargon',
              desc: 'Strokes gained matters. But so does "you missed 6 of your last 7 chip shots right." We make stats human.',
            },
            {
              num: '02',
              title: 'Every golfer deserves better',
              desc: 'Tour players have launch monitors and data analysts. Weekend golfers have a notepad. We think that gap is absurd.',
            },
            {
              num: '03',
              title: 'Privacy first',
              desc: 'Your round data is yours. We don\'t sell it, share it, or use it for anything other than making your game better.',
            },
          ].map(v => (
            <div key={v.num} className="bg-white rounded-2xl border border-black/[0.05] p-7">
              <div className="font-serif text-[40px] font-medium text-black/[0.07] leading-none mb-4">{v.num}</div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-2">{v.title}</h3>
              <p className="text-[13.5px] text-[#666] leading-[1.65]">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 md:px-12 pb-16 max-w-[860px] mx-auto">
        <div className="bg-[#1A1A1A] rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #F5EFE0 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="relative z-10">
            <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-8">BY THE NUMBERS</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { stat: '42,000+', label: 'Courses worldwide' },
                { stat: '18',      label: 'Metrics tracked per round' },
                { stat: '50+',     label: 'Features at launch' },
                { stat: '2',       label: 'Rounds free — always' },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-serif text-[36px] md:text-[44px] font-medium text-[#DF9905] leading-none">{s.stat}</div>
                  <div className="text-[12px] text-[#888] mt-2 leading-[1.4]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 pb-24 max-w-[860px] mx-auto">
        <div className="text-center">
          <h2 className="font-serif text-[28px] md:text-[36px] font-medium tracking-[-0.02em] mb-4">
            Ready to understand your game?
          </h2>
          <p className="text-[14.5px] text-[#666] mb-8">Start with 2 rounds, completely free. No credit card required.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-[#DF9905] hover:bg-[#c98a04] text-white font-semibold px-8 py-3.5 rounded-xl text-[15px] transition-colors">
              Get Started Free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11L9 7L5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-white border border-black/[0.1] text-[#1A1A1A] font-semibold px-8 py-3.5 rounded-xl text-[15px] transition-colors hover:border-black/30">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-10 max-w-[1400px] mx-auto border-t border-black/[0.06]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[12px] text-[#888]">© 2026 TracerBuddy. All rights reserved.</div>
          <div className="flex items-center gap-6 text-[12px] text-[#888]">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/about" className="hover:text-black transition-colors">About</Link>
            <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
