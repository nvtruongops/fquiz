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

  // Dynamic course routes (e.g., /courses/mln122)
  let courseRoutes: MetadataRoute.Sitemap = []
  try {
    await connectDB()
    const categories = await Category.find({ status: { $ne: 'deleted' } }, { code: 1, name: 1, updatedAt: 1 })
      .lean()
      .exec()

    courseRoutes = categories
      .filter((cat) => Boolean((cat as { code?: string }).code))
      .map((cat) => ({
        url: `${baseUrl}/courses/${String((cat as { code?: string }).code).toLowerCase()}`,
        lastModified: ((cat as { updatedAt?: Date }).updatedAt) || currentDate,
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
  } catch (err) {
    console.error('[sitemap] Failed to fetch category routes:', err)
  }

  return [...staticRoutes, ...courseRoutes]
}
