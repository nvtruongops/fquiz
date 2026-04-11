import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import '@/models/User' // Import to register the User schema for populate
import '@/models/Category' // Import to register the Category schema for populate
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

    const { searchParams } = request.nextUrl
    const sort = searchParams.get('sort') || 'recent'
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const query: Record<string, unknown> = { 
      is_public: true,
      status: 'published'
    }
    
    if (categoryId) {
      query.category_id = categoryId
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { course_code: { $regex: search, $options: 'i' } }
      ]
    }

    let sortOption: Record<string, 1 | -1> = { created_at: -1 }
    if (sort === 'popular') {
      sortOption = { studentCount: -1 }
    }

    const quizzes = await Quiz.find(query)
      .select('title description category_id course_code questionCount studentCount created_by created_at')
      .populate('created_by', 'username')
      .populate('category_id', 'name')
      .sort(sortOption)
      .skip(offset)
      .limit(limit)
      .lean()

    const response = NextResponse.json({
      data: quizzes.map((quiz: any) => ({
        id: quiz._id.toString(),
        title: quiz.title,
        course_code: quiz.course_code,
        source_type: 'explore_public' as const,
        source_label: 'Thư viện công khai',
        source_creator_name: quiz.created_by?.username || null,
        questionCount: quiz.questionCount,
        studentCount: quiz.studentCount || 0,
        categoryId: quiz.category_id?._id?.toString() || '',
        categoryName: quiz.category_id?.name || 'Chưa phân loại',
        latestCorrectCount: null,
        latestTotalCount: null,
        latestScoreOnTen: null,
        totalStudyMinutes: null,
      })),
    })

    // Add cache headers for public data
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
