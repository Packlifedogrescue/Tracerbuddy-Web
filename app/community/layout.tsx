import type { ReactNode } from 'react'
import CommunityHeader from './CommunityHeader'

export const metadata = {
  title: 'Community — TracerBuddy',
  description: 'Golf rounds, tips, and discussions from the TracerBuddy community.',
  alternates: { canonical: '/community' },
}

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F4EE]">
      <CommunityHeader />
      {children}
    </div>
  )
}
