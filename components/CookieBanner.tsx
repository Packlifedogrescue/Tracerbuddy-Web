'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('cookie_consent')) return

    fetch('/api/geo')
      .then(r => r.json())
      .then(({ eu }) => { if (eu) setShow(true) })
      .catch(() => {})
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted')
    setShow(false)
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] p-4 md:p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-[#1A1A1A] border border-white/[0.08] rounded-2xl p-5 shadow-2xl pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-gray-300 leading-relaxed">
            We use cookies to improve your experience and analyse usage.{' '}
            <Link href="/privacy" className="text-[#C9A84C] hover:underline">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="text-[12px] font-semibold text-gray-400 hover:text-white px-4 py-2 rounded-xl hover:bg-white/[0.06] transition-all"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="text-[12px] font-bold bg-[#C9A84C] text-white px-5 py-2 rounded-xl hover:bg-[#A07828] transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
