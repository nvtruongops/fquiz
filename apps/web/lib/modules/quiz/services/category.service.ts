import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category, PUBLIC_CATEGORY_MATCH, Quiz, User } from '@fquiz/models'

export interface CategorySummaryItem {
  id: string
  name: string
  publishedQuizCount: number
  quizCount: number
  type: 'public'
}

/**
 * Fetch all public, approved categories with their published quiz counts.
 */
export async function getPublicCategories(): Promise<CategorySummaryItem[]> {
  await connectDB()

  const categories = await Category.find(PUBLIC_CATEGORY_MATCH)
    .select('name')
    .sort({ name: 1 })
    .lean()

  const categoryIds = categories.map((cat: any) => cat._id)
  const quizCounts = await Quiz.aggregate([
    {
      $match: {
        category_id: { $in: categoryIds },
        is_public: true,
        status: 'published',
        is_temp: { $ne: true },
      },
    },
    {
      $group: {
        _id: '$category_id',
        count: { $sum: 1 },
      },
    },
  ])

  const countMap = new Map(quizCounts.map((item: any) => [item._id.toString(), item.count]))

  return categories.map((cat: any) => {
    const count = countMap.get(cat._id.toString()) || 0
    return {
      id: cat._id.toString(),
      name: cat.name,
      publishedQuizCount: count,
      quizCount: count,
      type: 'public' as const,
    }
  })
}

/**
 * Fetch a student's pinned category IDs directly from database.
 */
export async function getStudentPinnedCategoryIds(userId: string): Promise<string[]> {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return []
  await connectDB()
  const user = await User.findById(userId).select('pinned_categories').lean() as any
  return user?.pinned_categories ?? []
}
