import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { connectDB } from '@/lib/mongodb'
import { Types } from 'mongoose'
import { authorizeResource } from '@/lib/authz'
import { logSecurityEvent } from '@/lib/logger'
import { Category } from '@/models/Category'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    let rawQuiz: any
    try {
      rawQuiz = await authorizeResource(payload, id, Quiz, 'quiz', 'created_by')
    } catch (err) {
      if (err instanceof Response) {
        if (err.status !== 403) {
          return err
        }

        // Fallback for public published quizzes.
        const publicQuiz = await Quiz.findById(id)
          .select('created_by status is_public original_quiz_id is_saved_from_explore')
          .lean()

        if (publicQuiz?.is_public && publicQuiz.status === 'published') {
          rawQuiz = publicQuiz
        } else {
          // If this quiz is the original source of a saved Explore quiz owned by current student,
          // return a business-friendly lock message instead of generic ownership forbidden.
          const savedCopy = await Quiz.findOne({
            created_by: new Types.ObjectId(payload.userId),
            is_saved_from_explore: true,
            original_quiz_id: new Types.ObjectId(id),
          })
            .select('_id')
            .lean()

          if (savedCopy) {
            return NextResponse.json(
              {
                error: 'Không thể làm lại vì bộ đề gốc đã bị ẩn.',
                code: 'QUIZ_SOURCE_LOCKED',
                hint: 'Bạn vẫn có thể xem lại kết quả tại mục Lịch sử hoặc chọn một bộ đề khác.',
              },
              { status: 403 }
            )
          }

          return NextResponse.json({ error: 'Bạn không có quyền truy cập bộ đề này.' }, { status: 403 })
        }
      } else { throw err }
    }

    if (
      rawQuiz.is_saved_from_explore === true &&
      rawQuiz.original_quiz_id &&
      Types.ObjectId.isValid(rawQuiz.original_quiz_id.toString())
    ) {
      const originalQuiz = await Quiz.findById(rawQuiz.original_quiz_id)
        .select('status is_public')
        .lean() as { status: string; is_public: boolean } | null

      if (originalQuiz && !(originalQuiz.status === 'published' && originalQuiz.is_public)) {
        return NextResponse.json(
          {
            error: 'Không thể làm lại vì bộ đề gốc đã bị ẩn.',
            code: 'QUIZ_SOURCE_LOCKED',
            hint: 'Bạn vẫn có thể xem lại kết quả tại mục Lịch sử hoặc chọn một bộ đề khác.',
          },
          { status: 403 }
        )
      }
    }

    const quiz = await Quiz.findById(new Types.ObjectId(id))
      .select('title description course_code questionCount studentCount questions original_quiz_id is_saved_from_explore created_at category_id')
      .populate('category_id', 'name')
      .lean()

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const category = quiz.category_id as { name?: string } | null
    let effectiveQuizId = quiz._id
    let numQuestions =
      quiz.questionCount || (Array.isArray(quiz.questions) ? quiz.questions.length : 0)

    const shouldUseOriginalQuiz =
      quiz.original_quiz_id &&
      Types.ObjectId.isValid(quiz.original_quiz_id.toString()) &&
      (quiz.is_saved_from_explore === true || numQuestions === 0)

    if (shouldUseOriginalQuiz) {
      const originalQuiz = await Quiz.findById(quiz.original_quiz_id)
        .select('questionCount questions')
        .lean()
      if (originalQuiz) {
        effectiveQuizId = originalQuiz._id
        numQuestions =
          originalQuiz.questionCount ||
          (Array.isArray(originalQuiz.questions) ? originalQuiz.questions.length : 0)
      }
    }

    const uniqueStudents = await QuizSession.distinct('student_id', {
      quiz_id: effectiveQuizId,
      // Đếm cả active và completed sessions - tính ngay khi user bắt đầu làm
    })
    const numAttempts = uniqueStudents.length

    if (quiz.studentCount !== numAttempts && effectiveQuizId.toString() === quiz._id.toString()) {
      await Quiz.updateOne({ _id: quiz._id }, { $set: { studentCount: numAttempts } })
    }

    return NextResponse.json({
      _id: quiz._id.toString(),
      title: quiz.title,
      description: (quiz as any).description || '',
      category_id: { name: category?.name || 'Chung' },
      course_code: quiz.course_code,
      num_questions: numQuestions,
      num_attempts: numAttempts,
      created_at: quiz.created_at,
    })
  } catch (error) {
    console.error('Error fetching student quiz detail:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const quiz = await authorizeResource(payload, id, Quiz, 'quiz', 'created_by')

    await (quiz as any).deleteOne()

    logSecurityEvent('student_quiz_deleted', {
      request_id: req.headers.get('x-request-id') || 'unknown',
      user_id: payload.userId,
      route: `/api/student/quizzes/${id}`,
      outcome: 'success'
    }, `Student deleted their quiz: ${id}`)

    return NextResponse.json({ message: 'Quiz deleted successfully' })
  } catch (error) {
    console.error('Error deleting student quiz:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { category_id } = (body as { category_id?: string })
    const quiz = await authorizeResource(payload, id, Quiz, 'quiz', 'created_by')

    if (quiz.is_saved_from_explore) {
      return NextResponse.json(
        { error: 'Quiz đã lưu từ Explore không thể chuyển danh mục.' },
        { status: 400 }
      )
    }

    if (!category_id) {
      return NextResponse.json({ error: 'Danh mục là bắt buộc.' }, { status: 400 })
    }

    if (!Types.ObjectId.isValid(category_id)) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 })
    }

    const category = await Category.findOne({
      _id: new Types.ObjectId(category_id),
      owner_id: new Types.ObjectId(payload.userId),
      type: 'private',
    }).lean()

    if (!category) {
      return NextResponse.json({ error: 'Danh mục đích không tồn tại hoặc không thuộc về bạn.' }, { status: 404 })
    }

    quiz.category_id = new Types.ObjectId(category_id)
    await quiz.save()

    return NextResponse.json({ message: 'Quiz category updated successfully' })
  } catch (error) {
    console.error('Error moving student quiz category:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
