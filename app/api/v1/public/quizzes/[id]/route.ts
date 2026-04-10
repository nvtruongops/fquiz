import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import { checkPublicApiRateLimit } from '@/lib/rate-limit/public-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting (with error handling inside)
    const rateLimitResponse = await checkPublicApiRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

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

    const { id } = await params
    
    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid quiz ID format' },
        { status: 400 }
      )
    }

    const quiz = await Quiz.findById(id)
      .select('title description category_id course_code questionCount studentCount created_by created_at is_public status')
      .populate('created_by', 'username')
      .populate('category_id', 'name')
      .lean()

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    // Check if quiz is public and published
    const quizAny = quiz as any
    if (!quizAny.is_public || quizAny.status !== 'published') {
      return NextResponse.json(
        { error: 'This quiz is not publicly accessible' },
        { status: 403 }
      )
    }

    const response = NextResponse.json({
      data: {
        id: quizAny._id.toString(),
        title: quizAny.title,
        description: quizAny.description || '',
        categoryName: quizAny.category_id?.name || 'Chưa phân loại',
        course_code: quizAny.course_code,
        questionCount: quizAny.questionCount,
        studentCount: quizAny.studentCount || 0,
        createdAt: quizAny.created_at,
      },
    })

    // Add cache headers for public data
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
