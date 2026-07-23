import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Question } from '@/lib/modules/quiz/models/Question'
import { Category } from '@/lib/modules/quiz/models/Category'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { SessionQuestionQuerySchema } from '@/lib/core/schemas/common'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'

/**
 * Application-level join: resolve category name from category_id.
 * Replaces .populate('category_id') — avoids cross-module Mongoose ref.
 */
async function resolveCategoryName(categoryId: any): Promise<string> {
  if (!categoryId) return 'Chưa phân loại'
  const cat = await Category.findById(categoryId).select('name').lean()
  return (cat as any)?.name || 'Chưa phân loại'
}

/**
 * Resolve a single question by index, supporting both embedded (legacy) and question_refs (new).
 * Priority: question_refs → questions_cache → embedded questions.
 */
async function resolveQuestion(
  quiz: any,
  index: number,
): Promise<IQuestion | null> {
  // New: resolve from question_refs
  if (Array.isArray(quiz.question_refs) && quiz.question_refs.length > index) {
    const refId = quiz.question_refs[index]
    const q = await Question.findById(refId)
      .select('text options correct_answer explanation image_url')
      .lean()
    if (q) return q as unknown as IQuestion
  }

  // Legacy fallback: embedded questions
  if (Array.isArray(quiz.questions) && quiz.questions.length > index) {
    return quiz.questions[index] as IQuestion
  }

  return null
}

/**
 * GET /api/sessions/[id]
 * Returns the current question and submitted answers for a quiz session.
 * Requirements: 13.2, 13.3, 12.3
 */
export const GET = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const validation = await validateQuizSessionRequest(id, payload)
    if (!validation.isValid) return validation.response

    const session = validation.session

    if (session.status === 'expired') {
      return NextResponse.json({
        error: 'Phiên làm bài đã tự động kết thúc.',
        expired: true,
      }, { status: 410 })
    }

    // Handle 'preparing' status — quiz might not be created yet
    if (session.status === 'preparing') {
      return NextResponse.json({
        session: {
          _id: session._id,
          mode: session.mode,
          status: 'preparing',
          current_question_index: 0,
          totalQuestions: 0,
          user_answers: [],
          courseCode: 'Đang chuẩn bị...',
          categoryName: 'Đang chuẩn bị...',
          title: 'Đang chuẩn bị bộ đề...',
          started_at: session.started_at,
          is_temp: true,
        },
        question: null,
      }, { status: 200 })
    }

    // Fetch quiz metadata + question refs once (used for order resolution, out-of-bound checks, and question fetching)
    const quiz = await Quiz.findById(session.quiz_id)
      .select('course_code title category_id questions question_refs').lean() as any
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    let questionOrder = session.question_order
    let sessionTotalQuestions = questionOrder?.length || 0

    if (!questionOrder || questionOrder.length === 0) {
      const totalQ = (quiz.question_refs?.length) || (quiz.questions?.length) || 0
      questionOrder = Array.from({ length: totalQ }, (_, i) => i)
      sessionTotalQuestions = totalQ
    }

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

    // If session is completed or currentIndex is out of bounds, return session info without question
    if (currentIndex < 0 || currentIndex >= sessionTotalQuestions) {
      const categoryName = await resolveCategoryName(quiz.category_id)
      
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
            categoryName,
            title: quiz.title,
            started_at: session.started_at,
            paused_at: session.paused_at,
            total_paused_duration_ms: session.total_paused_duration_ms,
            is_temp: Boolean(session.is_temp),
            quiz_id: session.quiz_id,
            ...(session.mode === 'flashcard' && session.flashcard_stats ? { flashcard_stats: session.flashcard_stats } : {}),
          },
          question: null,
        },
        { status: 200 }
      )
    }

    const actualQuestionIndex = questionOrder[currentIndex]
    const categoryName = await resolveCategoryName(quiz.category_id)

    // Resolve question: prioritize session.questions_cache if present (e.g. retry-wrong / mix-quiz sessions), fallback to quiz refs/embedded
    let rawQuestion: IQuestion | null = null
    if (session.questions_cache && session.questions_cache.length > 0 && session.questions_cache[actualQuestionIndex]) {
      rawQuestion = session.questions_cache[actualQuestionIndex] as unknown as IQuestion
    }
    if (!rawQuestion) {
      rawQuestion = await resolveQuestion(quiz, actualQuestionIndex)
    }
    if (!rawQuestion) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    // Req 12.3: exclude correct_answer and explanation when session is not completed
    // Exception: flashcard mode always needs correct_answer and explanation
    const isCompleted = session.status === 'completed'
    const isFlashcardMode = session.mode === 'flashcard'
    const isImmediateMode = session.mode === 'immediate'

    // Check if the current question index has already been answered by the student
    const isQuestionAnswered = (session.user_answers || []).some(
      (ua: any) => ua.question_index === currentIndex
    )

    const shouldShowAnswers = isCompleted || isFlashcardMode || (isImmediateMode && isQuestionAnswered)

    const question = shouldShowAnswers
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
          categoryName,
          title: quiz.title,
          started_at: session.started_at,
          paused_at: session.paused_at,
          total_paused_duration_ms: session.total_paused_duration_ms,
          is_temp: Boolean(session.is_temp),
          quiz_id: session.quiz_id,
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
}, { roles: ['student'] })
