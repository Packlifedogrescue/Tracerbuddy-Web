'use client'
import { useEffect, useState } from 'react'
import { fetchUserProfile } from '@/lib/supabase'

interface Props {
  children: React.ReactNode
  feature: string
  description?: string
}

export default function ProGate({ children, feature, description }: Props) {
  const [subscription, setSubscription] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserProfile().then(p => {
      setSubscription(p?.subscription ?? 'free')
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  if (subscription === 'pro') return <>{children}</>

  return (
    <div className="p-8 flex items-start justify-center min-h-[60vh]">
      <div className="card p-12 text-center max-w-md w-full mt-8">
        <div className="w-16 h-16 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] text-3xl mx-auto mb-5">
          ⭐
        </div>
        <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full px-3 py-1 mb-4">
          <span className="text-[#FFD700] text-xs font-black tracking-widest">PRO FEATURE</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-3">{feature}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          {description ?? `${feature} is available on the TracerBuddy Pro plan. Upgrade to unlock advanced analytics, AI coaching, and more.`}
        </p>
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-5">
          <div className="text-xs text-gray-600 font-bold tracking-widest mb-2">UPGRADE TO PRO</div>
          <p className="text-sm text-gray-400">Open the TracerBuddy iOS app and tap <span className="text-white font-bold">Profile → Upgrade to Pro</span></p>
        </div>
      </div>
    </div>
  )
}
