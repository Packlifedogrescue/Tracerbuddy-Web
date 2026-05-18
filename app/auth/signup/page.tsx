'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } }
    })
    if (error) { setError(error.message); setLoading(false) }
    else setSuccess(true)
  }

  async function handleAppleSignIn() {
    setAppleLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    if (error) { setError(error.message); setAppleLoading(false) }
  }

  if (success) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/">
          <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-20 w-auto mx-auto mb-10" />
        </Link>
        <div className="w-16 h-16 rounded-full bg-[#0A8F4F]/10 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M6 14L11 19L22 8" stroke="#0A8F4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A] mb-3">Check your inbox</h1>
        <p className="text-[15px] text-[#555] leading-[1.65] mb-2">
          We sent a confirmation link to
        </p>
        <p className="text-[15px] font-semibold text-[#0A0A0A] mb-6">{email}</p>
        <p className="text-[13.5px] text-[#888] leading-[1.65] mb-8">
          Click the link in that email to activate your account and start your 2 free rounds.
        </p>
        <p className="text-center text-[#666] text-sm">
          Already confirmed?{' '}
          <Link href="/auth/login" className="text-[#0A0A0A] font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-20 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-light text-[#0A0A0A] mt-6 tracking-tight">Create your account</h1>
          <p className="text-sm text-[#666] mt-1.5">Start tracking your game in seconds</p>
        </div>

        <button
          onClick={handleAppleSignIn}
          disabled={appleLoading || loading}
          className="w-full bg-[#0A0A0A] text-white font-semibold py-3.5 rounded-xl text-[15px] flex items-center justify-center gap-2.5 hover:bg-black transition disabled:opacity-50 mb-3"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          {appleLoading ? 'Connecting...' : 'Sign up with Apple'}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-black/10" />
          <span className="text-xs font-semibold text-[#888] tracking-wider">OR</span>
          <div className="flex-1 h-px bg-black/10" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-2">YOUR NAME</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Brett Miller" required
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-[#0A0A0A] transition"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-2">EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" required
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-[#0A0A0A] transition"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-2">PASSWORD</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="********" minLength={6} required
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-[#0A0A0A] transition"
            />
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading || appleLoading}
            className="w-full bg-[#DF9905] text-white font-bold py-3.5 rounded-xl text-[15px] hover:bg-[#A07509] active:scale-[0.97] transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account — Free'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-[#999]">
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1" y="5" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2"/></svg>
            256-bit encrypted
          </span>
          <span>·</span>
          <span>Never sold</span>
          <span>·</span>
          <span>Cancel anytime</span>
        </div>

        <p className="text-center text-[#666] text-sm mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#0A0A0A] font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
