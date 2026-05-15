'use client'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="bg-[#F5EFE0] text-[#1A1A1A] min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif' }}>

      {/* ════ NAV ════ */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-[1400px] mx-auto">
        <div className="flex items-center">
          <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-9 w-auto" />
        </div>
        <div className="hidden md:flex items-center gap-10">
          <a href="#features" className="text-[14px] text-[#333] hover:text-black">Features</a>
          <a href="#how" className="text-[14px] text-[#333] hover:text-black">How It Works</a>
          <a href="#watch" className="text-[14px] text-[#333] hover:text-black">Apple Watch</a>
          <a href="#pricing" className="text-[14px] text-[#333] hover:text-black">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-[14px] text-[#1A1A1A] hidden md:block hover:text-black">Sign In</Link>
          <Link href="/auth/signup" className="text-[14px] font-semibold bg-[#B8860B] text-white px-5 py-2.5 rounded-lg hover:bg-[#A07509] transition shadow-sm">Get Started</Link>
        </div>
      </nav>

      {/* ════ HERO ════ */}
      <section className="relative px-6 md:px-12 pt-8 md:pt-16 pb-12 overflow-hidden max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left: text */}
          <div className="relative z-10 pt-4">
            <h1 className="text-[44px] md:text-[68px] font-bold leading-[1.05] tracking-[-0.02em] mb-7" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Track Every Shot.<br />
              Understand <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#B8860B' }}>Every Round.</span>
            </h1>
            <p className="text-[15px] text-[#555] leading-[1.65] max-w-[450px] mb-9">
              Premium shot tracking, course mapping, scorecards,<br className="hidden md:block" />
              Apple Watch swing motion data, and round insights<br className="hidden md:block" />
              in one clean golf performance app.
            </p>
            <div className="flex gap-3">
              <Link href="/auth/signup" className="bg-[#B8860B] text-white px-7 py-3.5 rounded-lg font-semibold text-[14.5px] hover:bg-[#A07509] transition shadow-sm">
                Get Started
              </Link>
              <a href="#features" className="bg-white border border-black/15 text-[#1A1A1A] px-7 py-3.5 rounded-lg font-semibold text-[14.5px] hover:border-black/30 transition flex items-center gap-2">
                View Features
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11L9 7L5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </a>
            </div>
          </div>

          {/* Right: phone over course image */}
          <div className="relative">
            <img
              src="/images/hero-course.jpg"
              alt=""
              className="w-full h-[500px] object-cover rounded-2xl opacity-95"
            />
            <img
              src="/images/hero-phone.png"
              alt="TracerBuddy iPhone app"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] md:w-[340px] drop-shadow-[0_30px_60px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      </section>

      {/* ════ FEATURE STRIP ════ */}
      <section id="features" className="px-6 md:px-12 max-w-[1400px] mx-auto -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-black/[0.06]">
          {[
            { icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#B8860B" strokeWidth="1.8"><circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="2" fill="#B8860B"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="16" y1="26" x2="16" y2="30"/><line x1="2" y1="16" x2="6" y2="16"/><line x1="26" y1="16" x2="30" y2="16"/></svg>,
              title: 'Shot Tracking', desc: 'Track every shot with precision and build better habits.' },
            { icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#B8860B" strokeWidth="1.8"><path d="M4 6L12 4L20 6L28 4V26L20 28L12 26L4 28V6Z"/><line x1="12" y1="4" x2="12" y2="26"/><line x1="20" y1="6" x2="20" y2="28"/></svg>,
              title: 'Course Maps', desc: 'Beautiful GPS maps with accurate distances to every point.' },
            { icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#B8860B" strokeWidth="1.8"><rect x="9" y="6" width="14" height="20" rx="3"/><line x1="13" y1="3" x2="13" y2="6"/><line x1="19" y1="3" x2="19" y2="6"/><line x1="13" y1="26" x2="13" y2="29"/><line x1="19" y1="26" x2="19" y2="29"/></svg>,
              title: 'Apple Watch', desc: 'Automatic swing detection and motion data from your wrist.' },
            { icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#B8860B" strokeWidth="1.8"><rect x="5" y="18" width="5" height="10"/><rect x="13" y="12" width="5" height="16"/><rect x="21" y="6" width="5" height="22"/></svg>,
              title: 'Round Insights', desc: 'Powerful stats and trends to help you improve faster.' },
          ].map(f => (
            <div key={f.title} className="p-8 flex items-start gap-4">
              <div className="flex-shrink-0">{f.icon}</div>
              <div>
                <h3 className="text-[15px] font-bold mb-1.5 text-[#1A1A1A]">{f.title}</h3>
                <p className="text-[13px] text-[#666] leading-[1.55]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section id="how" className="px-6 md:px-12 py-24 md:py-28 max-w-[1400px] mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] font-bold text-[#B8860B] tracking-[0.25em] mb-4">HOW IT WORKS</div>
          <h2 className="text-3xl md:text-[42px] font-bold tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            Better Data. Better Decisions. Better Golf.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-12 md:gap-6 max-w-5xl mx-auto relative">
          <div className="hidden md:block absolute top-7 left-[28%] right-[28%] h-px border-t border-dashed border-black/20" />
          {[
            { num: '1', icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#B8860B" strokeWidth="1.8" strokeLinecap="round"><circle cx="16" cy="7" r="3"/><path d="M16 10v8M16 18l-4 8M16 18l4 8M12 14l-4-2M20 14l4-2"/></svg>,
              title: 'Track your round', desc: 'Automatically record shots, distances, and club data as you play.' },
            { num: '2', icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#B8860B" strokeWidth="1.8"><rect x="5" y="18" width="5" height="10"/><rect x="13" y="12" width="5" height="16"/><rect x="21" y="6" width="5" height="22"/></svg>,
              title: 'Review your misses', desc: 'See where you lose strokes and identify patterns in your game.' },
            { num: '3', icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#B8860B" strokeWidth="1.8"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="2" fill="#B8860B"/><path d="M22 10L28 4M28 4h-4M28 4v4" strokeLinecap="round"/></svg>,
              title: 'Improve your decisions', desc: 'Use insights and AI recommendations to make smarter choices.' },
          ].map(step => (
            <div key={step.num} className="text-center relative">
              <div className="w-14 h-14 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-lg mx-auto mb-5 relative z-10">
                {step.num}
              </div>
              <div className="flex justify-center mb-4">{step.icon}</div>
              <h3 className="font-bold text-[16px] mb-2 text-[#1A1A1A]">{step.title}</h3>
              <p className="text-[13.5px] text-[#666] leading-[1.65] max-w-[240px] mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════ iPHONE + APPLE WATCH ════ */}
      <section id="watch" className="px-6 md:px-12 pb-8 max-w-[1400px] mx-auto">
        <div className="bg-[#EFE7D4] rounded-2xl p-8 md:p-14 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-[11px] font-bold text-[#B8860B] tracking-[0.2em] mb-5">iPhone + Apple Watch</div>
            <h2 className="text-3xl md:text-[40px] font-bold leading-[1.15] tracking-tight mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              Everything you need.<br />Right on your wrist.
            </h2>
            <div className="space-y-3.5">
              {[
                'Shot tracking & distances on every hole',
                'Automatic swing detection on Apple Watch',
                'Real-time insights as you play',
              ].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border border-[#B8860B] flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#B8860B" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </div>
                  <span className="text-[14.5px] text-[#1A1A1A]">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <img src="/images/watch-section.png" alt="iPhone and Apple Watch" className="max-w-full h-auto" />
          </div>
        </div>
      </section>

      {/* ════ SWINGTRACE PREVIEW ════ */}
      <section className="px-6 md:px-12 pb-8 max-w-[1400px] mx-auto">
        <div className="bg-[#EFE7D4] rounded-2xl p-8 md:p-14 grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-3">
            <div className="text-[11px] font-bold text-[#B8860B] tracking-[0.2em] mb-5">SWINGTRACE PREVIEW</div>
            <h2 className="text-3xl md:text-[34px] font-bold leading-[1.15] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Understand your swing.<br />Improve your game.
            </h2>
          </div>
          <div className="md:col-span-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-[12px] font-semibold text-[#444] mb-2">Swing Speed</div>
              <div className="text-[44px] md:text-[52px] font-bold text-[#1A1A1A] leading-none">85</div>
              <div className="text-[11px] text-[#666] font-semibold mt-1.5">MPH</div>
              <svg width="100%" height="16" viewBox="0 0 100 16" className="mt-2"><path d="M0,12 Q15,4 30,10 T60,6 T90,8 T100,5" stroke="#B8860B" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            </div>
            <div className="text-center">
              <div className="text-[12px] font-semibold text-[#444] mb-2">Tempo</div>
              <div className="text-[44px] md:text-[52px] font-bold text-[#1A1A1A] leading-none">3:1:1</div>
              <span className="inline-block text-[10px] text-white bg-[#0A8F4F] px-2.5 py-0.5 rounded-full mt-1.5 font-semibold">Good</span>
              <svg width="100%" height="16" viewBox="0 0 100 16" className="mt-2"><path d="M0,8 Q15,11 30,5 T60,9 T90,6 T100,7" stroke="#B8860B" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            </div>
            <div className="text-center">
              <div className="text-[12px] font-semibold text-[#444] mb-2">Backswing Time</div>
              <div className="text-[44px] md:text-[52px] font-bold text-[#1A1A1A] leading-none">0.92</div>
              <div className="text-[11px] text-[#666] font-semibold mt-1.5">SEC</div>
              <svg width="100%" height="16" viewBox="0 0 100 16" className="mt-2"><path d="M0,10 Q15,6 30,11 T60,5 T90,9 T100,6" stroke="#B8860B" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            </div>
          </div>
          <div className="md:col-span-3 flex justify-center">
            <img src="/images/golfer.png" alt="Golfer swing" className="max-h-[200px] w-auto" />
          </div>
        </div>
      </section>

      {/* ════ PRICING ════ */}
      <section id="pricing" className="px-6 md:px-12 pb-8 max-w-[1400px] mx-auto">
        <div className="bg-[#EFE7D4] rounded-2xl p-8 md:p-14 grid md:grid-cols-3 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-[34px] font-bold tracking-tight mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              Simple pricing. Full access.
            </h2>
            <p className="text-[13.5px] text-[#555] leading-[1.65]">
              Choose monthly or yearly. Every plan includes the complete TracerBuddy experience.
            </p>
          </div>
          {/* Monthly */}
          <div className="bg-white rounded-xl p-7 border border-black/[0.06]">
            <div className="text-[13px] font-bold text-[#1A1A1A] mb-3">Monthly</div>
            <div className="flex items-baseline gap-1.5 mb-5">
              <span className="text-[36px] font-bold text-[#1A1A1A] leading-none">$24.99</span>
              <span className="text-[13px] text-[#888]">/ month</span>
            </div>
            <div className="space-y-2.5 mb-6">
              {['Full access', 'Cancel anytime', 'Best for trying TracerBuddy'].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="mt-1 flex-shrink-0"><path d="M3 7L5.5 9.5L10 4" stroke="#B8860B" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <span className="text-[13px] text-[#444]">{item}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/signup" className="block text-center bg-white border border-black/15 hover:border-black/30 transition text-[#1A1A1A] py-3 rounded-lg font-semibold text-[13.5px]">
              Start Monthly
            </Link>
          </div>
          {/* Yearly */}
          <div className="bg-white rounded-xl p-7 border-2 border-[#B8860B] relative shadow-[0_8px_24px_rgba(184,134,11,0.12)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-[#B8860B] text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">BEST VALUE</div>
            <div className="text-[13px] font-bold text-[#1A1A1A] mb-3">Yearly</div>
            <div className="flex items-baseline gap-1.5 mb-5">
              <span className="text-[36px] font-bold text-[#1A1A1A] leading-none">$199.99</span>
              <span className="text-[13px] text-[#888]">/ year</span>
            </div>
            <div className="space-y-2.5 mb-6">
              {['Full access', 'Save $99.89 compared to monthly', 'Best for serious golfers'].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="mt-1 flex-shrink-0"><path d="M3 7L5.5 9.5L10 4" stroke="#B8860B" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <span className="text-[13px] text-[#444]">{item}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/signup" className="block text-center bg-[#B8860B] text-white py-3 rounded-lg font-semibold text-[13.5px] hover:bg-[#A07509] transition">
              Start Yearly
            </Link>
          </div>
        </div>
      </section>

      {/* ════ CTA BANNER ════ */}
      <section className="px-6 md:px-12 pb-8 max-w-[1400px] mx-auto">
        <div className="relative rounded-2xl overflow-hidden h-[150px]">
          <img src="/images/cta-banner.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1a14]/95 via-[#0a1a14]/70 to-[#0a1a14]/20" />
          <div className="absolute inset-0 flex items-center justify-between px-8 md:px-14">
            <h3 className="text-white text-2xl md:text-[32px] font-bold leading-tight max-w-[400px]" style={{ fontFamily: 'Georgia, serif' }}>
              Every round should<br />make you better.
            </h3>
            <Link href="/auth/signup" className="bg-[#B8860B] text-white px-7 py-3.5 rounded-lg font-semibold text-[14.5px] hover:bg-[#A07509] transition shadow-lg whitespace-nowrap">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer className="px-6 md:px-12 py-8 max-w-[1400px] mx-auto border-t border-black/[0.08] mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="13" fill="#1A1A1A"/><circle cx="13" cy="13" r="4.5" fill="#F5EFE0"/></svg>
            <span className="text-[14.5px] font-bold">TracerBuddy</span>
          </div>
          <div className="flex items-center gap-7 text-[13px] text-[#555]">
            <a href="#features" className="hover:text-black">Features</a>
            <a href="#how" className="hover:text-black">How It Works</a>
            <a href="#watch" className="hover:text-black">Apple Watch</a>
            <a href="#pricing" className="hover:text-black">Pricing</a>
          </div>
          <div className="flex items-center gap-5 text-[12.5px] text-[#777]">
            <span className="hover:text-black cursor-pointer">Privacy</span>
            <span className="hover:text-black cursor-pointer">Terms</span>
            <span>© 2026 TracerBuddy</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
