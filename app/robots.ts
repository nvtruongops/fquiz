import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fquiz-web.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/explore', '/courses/', '/quiz/', '/terms', '/privacy'],
        disallow: ['/admin/', '/api/', '/settings/', '/my-quizzes/', '/history/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
