import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TracerBuddy',
  description: 'Know your shot. Know your miss. Know what to fix.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-dark text-white antialiased">{children}</body>
    </html>
  )
}
