'use client'
import { useEffect, useState } from 'react'
import { supabase, fetchUserProfile } from '@/lib/supabase'
import { User, MapPin, Check } from 'lucide-react'

function isEmail(s: string) { return s.includes('@') }

function bestName(profileDisplay: any, meta: any): string {
  const candidates = [
    profileDisplay,
    meta?.display_name,
    meta?.full_name,
    meta?.name,
  ]
  return candidates.find(c => c && c.trim() && !isEmail(c))?.trim() || ''
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [user,    setUser]    = useState<any>(null)
  const [name,    setName]    = useState('')
  const [course,  setCourse]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchUserProfile(), supabase.auth.getUser()]).then(
      ([p, { data: { user } }]) => {
        setProfile(p)
        setUser(user)
        setName(bestName((p as any)?.display_name, user?.user_metadata))
        setCourse((p as any)?.home_course ?? '')
        setLoading(false)
      }
    )
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('user_profiles').upsert({ display_name: name.trim(), home_course: course.trim() })
    // Also update auth metadata so name shows everywhere immediately
    await supabase.auth.updateUser({ data: { display_name: name.trim() } })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400">Loading profile…</p>
    </div>
  )

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase()

  const handicap   = (profile as any)?.handicap_index
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="p-5 md:p-6 max-w-2xl space-y-5 pb-10">
      <div>
        <h1 className="text-[26px] font-black text-[#111] tracking-tight">Profile</h1>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Identity card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9B8165] to-[#6D4C41] flex items-center justify-center text-white text-[22px] font-black shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-black text-[#111] leading-tight">
            {name || 'Your Name'}
          </div>
          <div className="text-[12.5px] text-gray-400 mt-0.5">{user?.email}</div>
          <span className="inline-block mt-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3E8] text-[#C9A84C]">
            Pro Plan
          </span>
        </div>
        {handicap != null && (
          <div className="text-right shrink-0">
            <div className="text-[32px] font-black text-[#C9A84C] leading-none">
              {parseFloat(Number(handicap).toFixed(1))}
            </div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
              Handicap
            </div>
          </div>
        )}
      </div>

      {/* Edit form */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-[13.5px] font-bold text-[#111]">Edit Profile</span>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Full Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="First Last"
              className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition text-[14px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Home Course
            </label>
            <input
              value={course}
              onChange={e => setCourse(e.target.value)}
              placeholder="e.g. TPC Scottsdale"
              className="w-full bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#111] placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition text-[14px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Email
            </label>
            <div className="bg-[#F8F4EE] border border-[#EDE8DC] rounded-xl px-4 py-3 text-gray-400 text-[14px]">
              {user?.email}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full font-bold py-3.5 rounded-xl text-[14.5px] transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-[#22A06B] text-white'
                : 'bg-[#C9A84C] text-white hover:bg-[#A07828]'
            } disabled:opacity-60`}
          >
            {saving ? 'Saving…' : saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-[13.5px] font-bold text-[#111]">Account</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Member since',  val: memberSince },
            { label: 'Subscription',  val: (profile as any)?.subscription === 'pro' ? 'Pro' : 'Free', gold: true },
            { label: 'Platform',      val: 'iOS + Web' },
          ].map(s => (
            <div key={s.label} className="flex justify-between items-center py-2 border-b border-[#F0EAE0] last:border-0">
              <span className="text-[13px] text-gray-400">{s.label}</span>
              <span className={`text-[13px] font-semibold ${s.gold ? 'text-[#C9A84C]' : 'text-[#111]'}`}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
