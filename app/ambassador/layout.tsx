import type { ReactNode } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ambassador Program — TracerBuddy',
  description: 'Join the TracerBuddy Ambassador Program — free Pro access, early features, and exclusive perks for golfers who love sharing the game.',
  alternates: { canonical: '/ambassador' },
}

export default function AmbassadorLayout({ children }: { children: ReactNode }) {
  return children
}
