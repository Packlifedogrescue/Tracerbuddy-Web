import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TracerBuddy — Golf Performance Tracking',
    short_name: 'TracerBuddy',
    description: 'Premium shot tracking, course mapping, swing motion data, and round insights for serious golfers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5EFE0',
    theme_color: '#C9A84C',
    icons: [
      {
        src: '/images/logo-icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
