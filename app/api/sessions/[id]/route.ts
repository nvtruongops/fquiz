import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { Category } from '@/models/Category'
import { authorizeResource } from '@/lib/authz'
import { SessionQuestionQuerySchema } from '@/lib/schemas'

/**
 * GET /api/sessions/[id]
 * Returns the current question and submitted answers for a quiz session.
 * Requirements: 13.2, 13.3, 12.3
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (payload.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
    }

    await connectDB()

    const session = await authorizeResource(payload, id, QuizSession, 'session', 'student_id')
    if (session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
        { status: 410 }
      )
    }

    const quiz = await Quiz.findById(session.quiz_id).populate('category_id').lean()
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const category = quiz.category_id
    const requestUrl = new URL(req.url)
    const queryParsed = SessionQuestionQuerySchema.safeParse(
      Object.fromEntries(requestUrl.searchParams.entries())
    )

    if (!queryParsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: queryParsed.error.issues,
        receivedParams: Object.fromEntries(requestUrl.searchParams.entries())
      }, { status: 400 })
    }

    const currentIndex = queryParsed.data.question_index ?? session.current_question_index

    // Use question_order to get the actual question index
    const questionOrder = session.question_order || Array.from({ length: quiz.questions.length }, (_, i) => i)
    const sessionTotalQuestions = questionOrder.length

    // If session is completed or currentIndex is out of bounds, return session info without question
    if (currentIndex < 0 || currentIndex >= sessionTotalQuestions) {
      return NextResponse.json(
        {
          session: {
            _id: session._id,
            mode: session.mode,
            status: session.status,
            current_question_index: session.current_question_index,
            totalQuestions: sessionTotalQuestions,
            user_answers: session.user_answers,
            courseCode: quiz.course_code,
            categoryName: category?.name || 'Chưa phân loại',
            title: quiz.title,
            started_at: session.started_at,
            paused_at: session.paused_at,
            total_paused_duration_ms: session.total_paused_duration_ms,
            is_temp: Boolean(session.is_temp),
            ...(session.mode === 'flashcard' && session.flashcard_stats ? { flashcard_stats: session.flashcard_stats } : {}),
          },
          question: null,
        },
        { status: 200 }
      )
    }

    const actualQuestionIndex = questionOrder[currentIndex]
    const rawQuestion = quiz.questions[actualQuestionIndex]

    if (!rawQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Req 12.3: exclude correct_answer and explanation when session is not completed
    // Exception: flashcard mode always needs correct_answer and explanation
    const isCompleted = session.status === 'completed'
    const isFlashcardMode = session.mode === 'flashcard'

    const question = (isCompleted || isFlashcardMode)
      ? {
          _id: rawQuestion._id,
          text: rawQuestion.text,
          options: rawQuestion.options,
          correct_answer: rawQuestion.correct_answer,
          explanation: rawQuestion.explanation,
          answer_selection_count: Array.isArray(rawQuestion.correct_answer)
            ? Math.min(Math.max(rawQuestion.correct_answer.length, 1), rawQuestion.options.length)
            : 1,
          ...(rawQuestion.image_url ? { image_url: rawQuestion.image_url } : {}),
        }
      : {
          _id: rawQuestion._id,
          text: rawQuestion.text,
          options: rawQuestion.options,
          answer_selection_count: Array.isArray(rawQuestion.correct_answer)
            ? Math.min(Math.max(rawQuestion.correct_answer.length, 1), rawQuestion.options.length)
            : 1,
          ...(rawQuestion.image_url ? { image_url: rawQuestion.image_url } : {}),
        }

    return NextResponse.json(
      {
        session: {
          _id: session._id,
          mode: session.mode,
          status: session.status,
          current_question_index: session.current_question_index,
          totalQuestions: sessionTotalQuestions,
          user_answers: session.user_answers,
          courseCode: quiz.course_code,
          categoryName: category?.name || 'Chưa phân loại',
          title: quiz.title,
          started_at: session.started_at,
          paused_at: session.paused_at,
          total_paused_duration_ms: session.total_paused_duration_ms,
          is_temp: Boolean(session.is_temp),
          ...(session.mode === 'flashcard' && session.flashcard_stats ? { flashcard_stats: session.flashcard_stats } : {}),
        },
        question,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('GET /api/sessions/[id] error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
