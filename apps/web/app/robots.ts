import type { MetadataRoute } from 'next'
import { resolveAppBaseUrl } from '@/lib/core/utils/url-utils'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveAppBaseUrl()

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
