import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { User } from '@/lib/modules/auth/models/User'
import { Category } from '@/lib/modules/quiz/models/Category'
import { checkPublicApiRateLimit } from '@/lib/core/security/rate-limit/public-api'
import {
  buildQuizListingQuery,
  mapPublicQuizRows,
  parseQuizListingParams,
} from '@/lib/modules/quiz/public-quiz-listing-helpers'

export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkPublicApiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const params = parseQuizListingParams(request.nextUrl.searchParams, 'recent')
    if (!params) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    const { limit, offset, search, category_id: categoryId, sort } = params

    try {
      await connectDB()
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        {
          error: 'Database connection failed',
        },
        { status: 503 }
      )
    }

    const query = buildQuizListingQuery(categoryId, search)

    let sortOption: Record<string, 1 | -1> = { created_at: -1 }
    if (sort === 'popular') {
      sortOption = { studentCount: -1 }
    }

    const quizzes = await Quiz.find(query)
      .select('title description category_id course_code questionCount studentCount created_by created_at')
      .sort(sortOption)
      .skip(offset)
      .limit(limit)
      .lean()

    // Application-level joins: batch fetch creators + categories
    const creatorIds = [...new Set(quizzes.map(q => q.created_by?.toString()).filter(Boolean))] as string[]
    const categoryIds = [...new Set(quizzes.map(q => q.category_id?.toString()).filter(Boolean))] as string[]

    const [creators, categories] = await Promise.all([
      creatorIds.length > 0
        ? User.find({ _id: { $in: creatorIds } }).select('username').lean()
        : Promise.resolve([]),
      categoryIds.length > 0
        ? Category.find({ _id: { $in: categoryIds } }).select('name').lean()
        : Promise.resolve([]),
    ])

    const response = NextResponse.json({
      data: mapPublicQuizRows(quizzes, creators, categories),
    })

    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

    return response
  } catch (error) {
    console.error('Error fetching quizzes:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Failed to fetch quizzes',
      },
      { status: 500 }
    )
  }
}
