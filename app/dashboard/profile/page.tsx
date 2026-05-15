'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchUserProfile } from '@/lib/supabase'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser]       = useState<any>(null)
  const [name, setName]       = useState('')
  const [course, setCourse]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchUserProfile(),
      supabase.auth.getUser()
    ]).then(([p, { data: { user } }]) => {
      setProfile(p); setUser(user)
      setName(p?.display_name ?? user?.email ?? '')
      setCourse(p?.home_course ?? '')
      setLoading(false)
    })
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await supabase.from('user_profiles').upsert({ display_name: name, home_course: course })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="p-8 text-gray-500">Loading profile...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Avatar + stats */}
      <div className="card p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#FFD700]/20 flex items-center justify-center text-[#FFD700] text-3xl font-black">
          {name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <div className="text-xl font-black text-white">{name || 'Golfer'}</div>
          <div className="text-gray-500 text-sm">{user?.email}</div>
          <div className="mt-1">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              profile?.subscription === 'pro'
                ? 'bg-[#FFD700]/20 text-[#FFD700]'
                : 'bg-white/5 text-gray-400'
            }`}>
              {profile?.subscription === 'pro' ? '⭐ Pro' : 'Free'}
            </span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-3xl font-black text-[#FFD700]">
            {profile?.handicap_index?.toFixed(1) ?? '—'}
          </div>
          <div className="stat-label">HANDICAP</div>
        </div>
      </div>

      {/* Edit form */}
      <div className="card p-6 mb-6">
        <div className="stat-label mb-5">EDIT PROFILE</div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-2">DISPLAY NAME</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/40" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">HOME COURSE</label>
            <input value={course} onChange={e => setCourse(e.target.value)}
              placeholder="Carlisle Barracks Golf Course"
              className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/40" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">EMAIL</label>
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl px-4 py-3 text-gray-500">
              {user?.email}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className={`w-full font-black py-4 rounded-xl transition-all ${
              saved ? 'bg-[#00E578] text-black' : 'bg-[#FFD700] text-black hover:bg-yellow-400'
            } disabled:opacity-50`}>
            {saving ? 'Saving...' : saved ? 'Saved! ✓' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="card p-6">
        <div className="stat-label mb-4">ACCOUNT</div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Member since</span>
            <span className="text-white">{user?.created_at ? new Date(user.created_at).getFullYear() : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Subscription</span>
            <span className="text-[#FFD700] font-bold">{profile?.subscription === 'pro' ? 'Pro' : 'Free'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Platform</span>
            <span className="text-white">iOS + Web</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#1F1F1F]">
          <a href="https://apps.apple.com" className="text-[#FFD700] text-sm font-bold hover:underline">
            → Download iOS App
          </a>
        </div>
      </div>
    </div>
  )
}
