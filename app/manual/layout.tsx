import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TracerBuddy — User Manual',
  description: 'How to use TracerBuddy on iPhone and Apple Watch — rounds, the Caddie, Live Rounds, Siri Shortcuts, and more.',
}

export default function ManualLayout({ children }: { children: React.ReactNode }) {
  return children
}
