import type { ReactNode } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — TracerBuddy',
  description: 'Get in touch with the TracerBuddy team — support, feedback, and general questions.',
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children
}
