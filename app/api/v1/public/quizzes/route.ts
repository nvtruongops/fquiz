import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { User } from '@/lib/modules/auth/models/User'
import { Category } from '@/lib/modules/quiz/models/Category'
import { checkPublicApiRateLimit } from '@/lib/core/security/rate-limit/public-api'

export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkPublicApiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
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

    const { searchParams } = request.nextUrl
    const sort = searchParams.get('sort') || 'recent'
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)

    const query: Record<string, unknown> = {
      is_public: true,
      status: 'published'
    }

    if (categoryId) {
      query.category_id = categoryId
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { course_code: { $regex: escaped, $options: 'i' } }
      ]
    }

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

    const creatorMap = new Map(creators.map(c => [c._id.toString(), c]))
    const categoryMap = new Map(categories.map(c => [c._id.toString(), c]))

    const response = NextResponse.json({
      data: quizzes.map((quiz) => {
        const creatorId = quiz.created_by?.toString() ?? ''
        const catId = quiz.category_id?.toString() ?? ''
        const creator = creatorMap.get(creatorId) as { username?: string } | undefined
        const category = categoryMap.get(catId) as { name?: string } | undefined

        return {
          id: quiz._id.toString(),
          title: quiz.title,
          course_code: quiz.course_code,
          source_type: 'explore_public' as const,
          source_label: 'Thư viện công khai',
          source_creator_name: creator?.username ?? null,
          questionCount: quiz.questionCount,
          studentCount: quiz.studentCount || 0,
          categoryId: catId,
          categoryName: category?.name ?? 'Chưa phân loại',
          latestCorrectCount: null,
          latestTotalCount: null,
          latestScoreOnTen: null,
          totalStudyMinutes: null,
        }
      }),
    })

    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

    return response
  } catch (error) {
    console.error('Error fetching quizzes:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Failed to fetch quizzes',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}
