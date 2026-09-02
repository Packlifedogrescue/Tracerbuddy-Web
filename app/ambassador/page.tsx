'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Send, Sparkles, Gift, Megaphone, Users } from 'lucide-react'

const EMPTY_FORM = {
  name: '', email: '', city: '', handicap: '', social: '', roundsPerMonth: '', why: '',
}

export default function AmbassadorPage() {
  const [form, setForm]     = useState(EMPTY_FORM)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/ambassador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setStatus('success'); setForm(EMPTY_FORM) }
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  const perks = [
    { icon: Gift,      title: 'Free Pro, on us',        desc: 'Full TracerBuddy Pro access for as long as you\'re an active ambassador — no charge.' },
    { icon: Sparkles,  title: 'Early access',           desc: 'New features land in your hands before they ship to everyone else.' },
    { icon: Megaphone, title: 'Featured on our channels', desc: 'Your rounds, your swing, your story — shared with the TracerBuddy community and socials.' },
    { icon: Users,     title: 'Direct line to the team', desc: 'Your feedback shapes what we build next. No support ticket queue — just a conversation.' },
  ]

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
      <section className="px-6 md:px-12 pt-20 pb-14 max-w-[1000px] mx-auto text-center">
        <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-6">AMBASSADOR PROGRAM</div>
        <h1 className="font-serif text-[40px] md:text-[68px] font-medium tracking-[-0.025em] leading-[1.05] mb-6">
          You already talk golf<br className="hidden md:block" />
          with everyone. <span className="italic text-[#DF9905]">Get paid in perks.</span>
        </h1>
        <p className="text-[16px] md:text-[17px] text-[#555] leading-[1.75] max-w-[600px] mx-auto">
          We're looking for golfers who genuinely love the game and aren't shy about sharing what they're playing with. Any handicap, any following size — what matters is that you're real about it.
        </p>
      </section>

      {/* Perks grid */}
      <section className="px-6 md:px-12 pb-16 max-w-[1100px] mx-auto">
        <div className="grid sm:grid-cols-2 gap-4">
          {perks.map(p => (
            <div key={p.title} className="bg-white rounded-2xl border border-black/[0.05] p-6 flex gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#F8F4EE] flex items-center justify-center shrink-0">
                <p.icon className="w-5 h-5 text-[#DF9905]" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-1.5">{p.title}</h3>
                <p className="text-[13px] text-[#666] leading-[1.6]">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What we look for */}
      <section className="px-6 md:px-12 pb-16 max-w-[900px] mx-auto">
        <div className="bg-[#1A1A1A] text-[#F5EFE0] rounded-3xl p-8 md:p-10">
          <div className="text-[10px] font-bold text-[#DF9905] tracking-[0.25em] mb-4">WHAT WE'RE LOOKING FOR</div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              'You actually play — a few rounds a month, minimum',
              'You post about golf, or talk about it with a group that listens',
              'You use TracerBuddy (or want to) and have real opinions on it',
              'Any handicap — scratch or 30, it doesn\'t matter here',
              'You\'ll give us honest feedback, not just praise',
              'You\'re active for at least one full season',
            ].map(item => (
              <div key={item} className="flex items-start gap-2.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-1 shrink-0"><path d="M3 7L5.5 9.5L10 4" stroke="#DF9905" strokeWidth="2" strokeLinecap="round"/></svg>
                <span className="text-[13.5px] text-[#ccc] leading-[1.6]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="px-6 md:px-12 pb-24 max-w-[700px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-serif text-[28px] md:text-[36px] font-medium tracking-[-0.02em] leading-[1.1] mb-3">
            Apply below.
          </h2>
          <p className="text-[14px] text-[#666]">Takes two minutes. We read every application ourselves.</p>
        </div>

        {status === 'success' ? (
          <div className="bg-white rounded-2xl border border-black/[0.05] p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#DF9905]/10 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="#DF9905" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2">Application sent!</h3>
            <p className="text-[14px] text-[#666] mb-6">Thanks for applying. We review these personally and will reach out if it's a fit.</p>
            <button
              onClick={() => setStatus('idle')}
              className="text-[13.5px] font-semibold text-[#DF9905] hover:underline"
            >
              Submit another application
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/[0.05] p-8 space-y-5">

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amb-name" className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Name</label>
                <input
                  id="amb-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition"
                />
              </div>
              <div>
                <label htmlFor="amb-email" className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Email</label>
                <input
                  id="amb-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="amb-city" className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">City / State</label>
                <input
                  id="amb-city"
                  type="text"
                  required
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Austin, TX"
                  className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition"
                />
              </div>
              <div>
                <label htmlFor="amb-handicap" className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Handicap</label>
                <input
                  id="amb-handicap"
                  type="text"
                  value={form.handicap}
                  onChange={e => setForm(f => ({ ...f, handicap: e.target.value }))}
                  placeholder="e.g. 14"
                  className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition"
                />
              </div>
              <div>
                <label htmlFor="amb-rounds" className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Rounds / month</label>
                <input
                  id="amb-rounds"
                  type="text"
                  value={form.roundsPerMonth}
                  onChange={e => setForm(f => ({ ...f, roundsPerMonth: e.target.value }))}
                  placeholder="e.g. 4-6"
                  className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="amb-social" className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">
                Instagram / TikTok / social handle <span className="normal-case font-normal text-gray-300">(optional)</span>
              </label>
              <input
                id="amb-social"
                type="text"
                value={form.social}
                onChange={e => setForm(f => ({ ...f, social: e.target.value }))}
                placeholder="@yourhandle"
                className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition"
              />
            </div>

            <div>
              <label htmlFor="amb-why" className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Why do you want to be a TracerBuddy Ambassador?</label>
              <textarea
                id="amb-why"
                required
                rows={5}
                value={form.why}
                onChange={e => setForm(f => ({ ...f, why: e.target.value }))}
                placeholder="Tell us about your golf, your audience (if you have one), and why you'd be a good fit…"
                className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition resize-none"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-[13px]">Something went wrong — please try again or email us at contact@tracerbuddy.com.</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black text-white font-bold py-3.5 rounded-xl text-[14.5px] transition-colors disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {status === 'sending' ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        )}
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
