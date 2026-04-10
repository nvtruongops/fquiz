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
    // Connect to database with timeout handling
    try {
      await connectDB()
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          message: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 503 }
      )
    }
    
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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}
