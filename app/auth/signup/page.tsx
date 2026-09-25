'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } }
    })
    if (error) { setError(error.message); setLoading(false) }
    else {
      fetch('/api/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      }).catch(() => {})
      window.location.href = '/dashboard'
    }
  }

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

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-2">YOUR NAME</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your full name" required
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
            type="submit" disabled={loading}
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
