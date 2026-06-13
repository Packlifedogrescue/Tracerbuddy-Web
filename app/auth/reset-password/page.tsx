'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setDone(true); setTimeout(() => router.push('/dashboard'), 2000) }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-14 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-light text-[#0A0A0A] mt-6 tracking-tight">Set new password</h1>
          <p className="text-sm text-[#666] mt-1.5">Choose a strong password for your account</p>
        </div>

        {done ? (
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-4 text-green-700 text-sm text-center">
            Password updated! Redirecting to your dashboard…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-2">NEW PASSWORD</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="********" minLength={6} required
                className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-[#0A0A0A] transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#666] tracking-wider block mb-2">CONFIRM PASSWORD</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
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
              className="w-full bg-[#DF9905] text-white font-bold py-3.5 rounded-xl text-[15px] hover:bg-[#A07509] transition disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}

        <p className="text-center text-[#666] text-sm mt-6">
          <Link href="/auth/login" className="text-[#0A0A0A] font-bold hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
