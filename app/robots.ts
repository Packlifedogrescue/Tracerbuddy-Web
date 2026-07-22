import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tracerbuddy.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/auth', '/admin', '/api'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
