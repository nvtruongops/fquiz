import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/explore', '/courses/', '/quiz/', '/terms', '/privacy'],
        disallow: ['/admin/', '/api/', '/settings/', '/history/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
