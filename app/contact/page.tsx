'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Send, Mail, MessageSquare, HelpCircle } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm]     = useState({ name: '', email: '', subject: 'General', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setStatus('success'); setForm({ name: '', email: '', subject: 'General', message: '' }) }
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  const topics = [
    { value: 'General',      label: 'General enquiry',    icon: MessageSquare },
    { value: 'Support',      label: 'App support',        icon: HelpCircle    },
    { value: 'Billing',      label: 'Billing question',   icon: Mail          },
    { value: 'Feedback',     label: 'Feature feedback',   icon: Send          },
  ]

  return (
    <div className="bg-[#F5EFE0] text-[#1A1A1A] min-h-screen font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F5EFE0] border-b border-black/[0.04]">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-[1400px] mx-auto">
          <Link href="/" className="flex items-center">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-16 w-auto" />
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
      <div className="px-6 md:px-12 py-16 max-w-[900px] mx-auto">
        <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-4">GET IN TOUCH</div>
        <h1 className="font-serif text-[40px] md:text-[56px] font-medium tracking-[-0.025em] leading-[1.05] mb-4">
          We'd love to<br />hear from you.
        </h1>
        <p className="text-[16px] text-[#666] leading-[1.7] max-w-[480px]">
          Questions, feedback, support — whatever you need. We read every message and usually reply within one business day.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="px-6 md:px-12 pb-24 max-w-[900px] mx-auto">
        <div className="grid md:grid-cols-5 gap-8 items-start">

          {/* Sidebar */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-black/[0.05] p-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Email us directly</div>
              <a href="mailto:contact@tracerbuddy.com" className="flex items-center gap-3 text-[#1A1A1A] hover:text-[#DF9905] transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-[#F8F4EE] flex items-center justify-center group-hover:bg-[#DF9905]/10 transition-colors">
                  <Mail className="w-4 h-4 text-[#DF9905]" />
                </div>
                <div>
                  <div className="text-[13.5px] font-bold">contact@tracerbuddy.com</div>
                  <div className="text-[11.5px] text-gray-400 mt-0.5">General & support</div>
                </div>
              </a>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.05] p-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Response times</div>
              <div className="space-y-3">
                {[
                  { label: 'General enquiries', time: '1–2 business days' },
                  { label: 'App support',        time: 'Within 24 hours'  },
                  { label: 'Billing issues',     time: 'Within 24 hours'  },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between gap-2">
                    <span className="text-[12.5px] text-[#666]">{r.label}</span>
                    <span className="text-[12px] font-semibold text-[#1A1A1A] text-right shrink-0">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#DF9905] mb-3">Quick links</div>
              <div className="space-y-2.5">
                {[
                  { href: '/auth/signup', label: 'Start free — 2 rounds' },
                  { href: '/privacy',    label: 'Privacy policy'         },
                  { href: '/terms',      label: 'Terms of service'       },
                  { href: '/about',      label: 'About TracerBuddy'      },
                ].map(l => (
                  <Link key={l.href} href={l.href} className="flex items-center justify-between text-[13px] text-[#aaa] hover:text-white transition-colors group">
                    {l.label}
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="opacity-40 group-hover:opacity-100 transition-opacity"><path d="M5 11L9 7L5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-3">
            {status === 'success' ? (
              <div className="bg-white rounded-2xl border border-black/[0.05] p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[#DF9905]/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="#DF9905" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </div>
                <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2">Message sent!</h3>
                <p className="text-[14px] text-[#666] mb-6">Thanks for reaching out. We'll get back to you shortly.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="text-[13.5px] font-semibold text-[#DF9905] hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/[0.05] p-8 space-y-5">

                {/* Topic selector */}
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-3">What's this about?</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {topics.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, subject: value }))}
                        className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
                          form.subject === value
                            ? 'bg-[#DF9905]/8 border-[#DF9905]/40 text-[#1A1A1A]'
                            : 'bg-[#F8F4EE] border-transparent text-[#666] hover:border-black/10'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${form.subject === value ? 'text-[#DF9905]' : 'text-gray-400'}`} />
                        <span className="text-[13px] font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name + email */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us how we can help…"
                    className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#DF9905] text-[14px] transition resize-none"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-red-400 text-[13px]">Something went wrong — please try again or email us directly.</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black text-white font-bold py-3.5 rounded-xl text-[14.5px] transition-colors disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {status === 'sending' ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

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
