import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { ToastProvider } from '@/components/Toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://tracerbuddy.app'),
  title: 'TracerBuddy — Know your shot. Know your miss. Know what to fix.',
  description: 'Premium shot tracking, course mapping, swing motion data, and round insights. The golf performance app for serious players.',
  icons: {
    icon: '/images/logo-icon.png',
    apple: '/images/logo-icon.png',
  },
  openGraph: {
    title: 'TracerBuddy — Golf Performance Tracking',
    description: 'Track every shot. Understand every round. The premium golf app for players who want to improve.',
    url: 'https://tracerbuddy.app',
    siteName: 'TracerBuddy',
    images: [{ url: '/images/watch-section.png', width: 1448, height: 1086, alt: 'TracerBuddy app on iPhone and Apple Watch' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TracerBuddy — Golf Performance Tracking',
    description: 'Track every shot. Understand every round. The premium golf app for players who want to improve.',
    images: ['/images/watch-section.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased"><ToastProvider>{children}</ToastProvider></body>
    </html>
  )
}
