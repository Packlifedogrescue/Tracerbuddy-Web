import type { ReactNode } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Round — TracerBuddy',
  description: 'Follow a TracerBuddy round live, hole by hole.',
  robots: { index: false, follow: false },
}

export default function LiveLayout({ children }: { children: ReactNode }) {
  return children
}
