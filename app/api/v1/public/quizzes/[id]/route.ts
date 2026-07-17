import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { User } from '@/lib/modules/auth/models/User'
import { Category } from '@/lib/modules/quiz/models/Category'
import { checkPublicApiRateLimit } from '@/lib/core/security/rate-limit/public-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkPublicApiRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

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

    const { id } = await params
    
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid quiz ID format' },
        { status: 400 }
      )
    }

    const quiz = await Quiz.findById(id)
      .select('title description category_id course_code questionCount studentCount created_by created_at is_public status')
      .lean()

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    if (!quiz.is_public || quiz.status !== 'published') {
      return NextResponse.json(
        { error: 'This quiz is not publicly accessible' },
        { status: 403 }
      )
    }

    // Application-level join for creator + category
    const [creator] = quiz.created_by
      ? await User.find({ _id: quiz.created_by }).select('username').lean()
      : []
    const [category] = quiz.category_id
      ? await Category.find({ _id: quiz.category_id }).select('name').lean()
      : []

    const response = NextResponse.json({
      data: {
        id: quiz._id.toString(),
        title: quiz.title,
        description: quiz.description || '',
        categoryName: (category as { name?: string } | undefined)?.name || 'Chưa phân loại',
        course_code: quiz.course_code,
        questionCount: quiz.questionCount,
        studentCount: quiz.studentCount || 0,
        createdAt: quiz.created_at,
      },
    })

    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error fetching quiz:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}
