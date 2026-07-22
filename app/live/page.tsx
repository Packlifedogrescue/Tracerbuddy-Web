'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Radio } from 'lucide-react'

export default function LiveEntryPage() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean.length >= 4) router.push(`/live/${clean}`)
  }

  return (
    <div className="bg-[#F5EFE0] text-[#1A1A1A] min-h-screen font-sans flex flex-col">
      <nav className="border-b border-black/[0.04]">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-[1400px] mx-auto w-full">
          <Link href="/">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-12 w-auto mix-blend-multiply" />
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
            <Radio className="w-6 h-6 text-[#DF9905]" />
          </div>
          <h1 className="font-serif text-[32px] font-medium tracking-[-0.02em] leading-[1.1] mb-3">
            Follow a round <span className="italic text-[#DF9905]">live.</span>
          </h1>
          <p className="text-[14px] text-[#666] leading-[1.65] mb-8">
            Enter the invite code from a TracerBuddy round to watch the leaderboard update hole by hole.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ROUND CODE"
              maxLength={6}
              autoFocus
              className="w-full text-center tracking-[0.35em] font-bold text-[20px] bg-white border border-black/[0.08] rounded-2xl px-4 py-4 placeholder:text-[#bbb] placeholder:tracking-[0.15em] placeholder:text-[14px] focus:outline-none focus:border-[#DF9905] transition"
            />
            <button
              type="submit"
              disabled={code.trim().length < 4}
              className="w-full bg-[#1A1A1A] text-[#F5EFE0] font-semibold text-[15px] rounded-2xl px-4 py-4 hover:bg-black transition-colors disabled:opacity-40"
            >
              Watch Live
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
