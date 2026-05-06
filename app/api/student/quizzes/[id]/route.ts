import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { connectDB } from '@/lib/mongodb'
import { Types } from 'mongoose'
import { authorizeResource } from '@/lib/authz'
import { logSecurityEvent } from '@/lib/logger'
import { Category } from '@/models/Category'

async function getAuthorizedQuiz(payload: any, id: string) {
  // 1. Fetch minimal quiz data
  const quiz = await Quiz.findById(id).select('created_by status is_public is_temp').lean() as any
  if (!quiz) {
    throw new Response(JSON.stringify({ error: 'Bộ đề không tồn tại.' }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }

  // 2. Check direct ownership
  const isOwner = quiz.created_by?.toString() === payload.userId
  if (isOwner) return quiz

  // 3. Fallback for Mixed Quizzes: If student has a session for it, they are authorized
  if (quiz.is_temp) {
    const hasSession = await QuizSession.exists({ 
      quiz_id: quiz._id, 
      student_id: new Types.ObjectId(payload.userId) 
    })
    if (hasSession) return quiz
  }

  // 4. Check if it's a public published quiz
  if (quiz.is_public && quiz.status === 'published') return quiz

  // 5. Check if it's a saved quiz (from explore) - might be owned by others but "saved" by this user
  const saved = await Quiz.findOne({ 
    created_by: new Types.ObjectId(payload.userId), 
    is_saved_from_explore: true, 
    original_quiz_id: new Types.ObjectId(id) 
  }).select('_id').lean()
  if (saved) return quiz

  // Otherwise, forbidden
  throw new Response(JSON.stringify({ error: 'Bạn không có quyền truy cập bộ đề này.' }), { 
    status: 403, 
    headers: { 'Content-Type': 'application/json' } 
  })
}

async function validateOriginalStatus(quiz: any) {
  // Temporary/Mixed quizzes don't need to validate a single original_quiz_id
  if (quiz.is_temp) return true

  if (quiz.is_saved_from_explore && quiz.original_quiz_id && Types.ObjectId.isValid(quiz.original_quiz_id.toString())) {
    const original = await Quiz.findById(quiz.original_quiz_id).select('status is_public').lean() as any
    if (original && !(original.status === 'published' && original.is_public)) return false
  }
  return true
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id || !Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid quiz ID format' }, { status: 400 })

    const rawQuiz = await getAuthorizedQuiz(payload, id).catch(async (e: any) => {
      if (e instanceof NextResponse) return e
      if (e instanceof Response) {
        const data = await e.json().catch(() => ({ error: 'Forbidden' }))
        return NextResponse.json(data, { status: e.status })
      }
      // Log unexpected errors
      console.error('[Student Quiz GET] Authorization error:', e)
      return NextResponse.json({ error: 'Internal Server Error during authorization' }, { status: 500 })
    })
    
    // If rawQuiz is an error response, return it immediately
    if (rawQuiz instanceof NextResponse) return rawQuiz

    if (!await validateOriginalStatus(rawQuiz)) {
      return NextResponse.json({ error: 'Không thể làm lại vì bộ đề gốc đã bị ẩn.', code: 'QUIZ_SOURCE_LOCKED', hint: 'Bạn vẫn có thể xem lại kết quả tại mục Lịch sử hoặc chọn một bộ đề khác.' }, { status: 403 })
    }

    const quiz = await Quiz.findById(new Types.ObjectId(id)).select('title description course_code questionCount studentCount questions original_quiz_id is_saved_from_explore is_temp created_by created_at category_id mix_config').populate('category_id', 'name').lean() as any
    if (!quiz) return NextResponse.json({ error: 'Bộ đề này không tồn tại hoặc đã bị xóa.', code: 'QUIZ_NOT_FOUND' }, { status: 404 })

    // Extra safety layer for temp quizzes
    const isOwner = quiz.created_by?.toString() === payload.userId
    const hasSession = quiz.is_temp ? await QuizSession.exists({ quiz_id: quiz._id, student_id: new Types.ObjectId(payload.userId) }) : false
    
    if (quiz.is_temp && !isOwner && !hasSession) {
      return NextResponse.json({ error: 'Bộ đề này không tồn tại hoặc đã bị xóa.', code: 'QUIZ_NOT_FOUND' }, { status: 404 })
    }

    let effectiveId = quiz._id
    let numQuestions = quiz.questionCount || quiz.questions?.length || 0

    if (quiz.original_quiz_id && Types.ObjectId.isValid(quiz.original_quiz_id.toString()) && (quiz.is_saved_from_explore || numQuestions === 0)) {
      const original = await Quiz.findById(quiz.original_quiz_id).select('questionCount questions').lean() as any
      if (original) {
        effectiveId = original._id
        numQuestions = original.questionCount || original.questions?.length || 0
      }
    }

    const uniqueStudents = await QuizSession.distinct('student_id', { quiz_id: effectiveId })
    const numAttempts = uniqueStudents.length
    if (quiz.studentCount !== numAttempts && effectiveId.toString() === quiz._id.toString()) {
      await Quiz.updateOne({ _id: quiz._id }, { $set: { studentCount: numAttempts } })
    }

    return NextResponse.json({ _id: quiz._id.toString(), title: quiz.title, description: quiz.description || '', category_id: { name: (quiz.category_id as any)?.name || 'Chung' }, course_code: quiz.course_code, num_questions: numQuestions, num_attempts: numAttempts, created_at: quiz.created_at, is_temp: quiz.is_temp, mix_config: quiz.mix_config })
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
