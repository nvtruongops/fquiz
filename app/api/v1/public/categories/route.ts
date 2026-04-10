import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { Quiz } from '@/models/Quiz'
import type { NextRequest } from 'next/server'
import { checkPublicApiRateLimit } from '@/lib/rate-limit/public-api'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await checkPublicApiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    await connectDB()
    
    // Get public categories that are approved
    const categories = await Category.find({ 
      is_public: true,
      status: 'approved'
    })
      .select('name')
      .sort({ name: 1 })
      .lean()

    // Count published quizzes for each category
    const categoryIds = categories.map(cat => cat._id)
    const quizCounts = await Quiz.aggregate([
      {
        $match: {
          category_id: { $in: categoryIds },
          is_public: true,
          status: 'published'
        }
      },
      {
        $group: {
          _id: '$category_id',
          count: { $sum: 1 }
        }
      }
    ])

    const countMap = new Map(quizCounts.map(item => [item._id.toString(), item.count]))

    const response = NextResponse.json({
      data: categories.map((cat: any) => ({
        id: cat._id.toString(),
        name: cat.name,
        publishedQuizCount: countMap.get(cat._id.toString()) || 0,
        type: 'public' as const,
      })),
    })

    // Add cache headers for public data
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
