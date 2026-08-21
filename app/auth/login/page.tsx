'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [resetMode, setResetMode]   = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else window.location.href = '/dashboard'
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/profile`,
    })
    setResetLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  if (resetMode) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/"><img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-20 w-auto mx-auto" /></Link>
          <h1 className="text-2xl font-light text-[#0A0A0A] mt-6 tracking-tight">Reset your password</h1>
          <p className="text-sm text-[#666] mt-1.5">We'll send a reset link to your email</p>
        </div>
        {resetSent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-center">
            <div className="text-green-700 font-semibold text-[14px] mb-1">Check your inbox</div>
            <div className="text-green-600 text-[13px]">A reset link has been sent to {email}</div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-2">EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required
                className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-[#0A0A0A] transition" />
            </div>
            {error && <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>}
            <button type="submit" disabled={resetLoading}
              className="w-full bg-[#DF9905] text-white font-bold py-3.5 rounded-xl text-[15px] hover:bg-[#A07509] active:scale-[0.97] transition disabled:opacity-50">
              {resetLoading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <button onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
          className="w-full text-center text-[#666] text-sm mt-6 hover:text-black transition">
          ← Back to sign in
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/"><img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-20 w-auto mx-auto" /></Link>
          <h1 className="text-2xl font-light text-[#0A0A0A] mt-6 tracking-tight">Welcome back</h1>
          <p className="text-sm text-[#666] mt-1.5">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-2">EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-[#0A0A0A] transition" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-[#666] tracking-wider">PASSWORD</label>
              <button type="button" onClick={() => { setResetMode(true); setError('') }}
                className="text-[11px] text-[#DF9905] font-semibold hover:underline">
                Forgot password?
              </button>
            </div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" required
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-[#0A0A0A] transition" />
          </div>

          {error && <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#DF9905] text-white font-bold py-3.5 rounded-xl text-[15px] hover:bg-[#A07509] active:scale-[0.97] transition disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-[#999]">
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1" y="5" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2"/></svg>
            256-bit encrypted
          </span>
          <span>·</span>
          <span>Your data is private</span>
          <span>·</span>
          <span>Cancel anytime</span>
        </div>

        <p className="text-center text-[#666] text-sm mt-5">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#0A0A0A] font-bold hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
