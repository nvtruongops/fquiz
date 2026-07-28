import type { MetadataRoute } from 'next'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fquiz-web.vercel.app'
  const currentDate = new Date()

  // Base static public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // Dynamic course routes (e.g., /courses/MLN131, /courses/MLN122)
  let courseRoutes: MetadataRoute.Sitemap = []
  try {
    await connectDB()
    const categories = await Category.find(
      { status: { $nin: ['pending', 'rejected'] } },
      { name: 1, updatedAt: 1, updated_at: 1 }
    )
      .lean()
      .exec()

    // Deduplicate by course code uppercase
    const seenCodes = new Set<string>()

    for (const cat of categories as any[]) {
      if (typeof cat.name === 'string' && cat.name.trim().length > 0) {
        const code = cat.name.trim().toUpperCase()
        if (!seenCodes.has(code)) {
          seenCodes.add(code)
          courseRoutes.push({
            url: `${baseUrl}/courses/${code}`,
            lastModified: cat.updatedAt || cat.updated_at || currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
          })
        }
      }
    }
  } catch (err) {
    console.error('[sitemap] Failed to fetch category routes:', err)
  }

  return [...staticRoutes, ...courseRoutes]
}
