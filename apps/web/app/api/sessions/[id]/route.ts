import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Question } from '@/lib/modules/quiz/models/Question'
import { Category } from '@/lib/modules/quiz/models/Category'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { QuestionUsageService } from '@/lib/modules/quiz/services/question-usage.service'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { SessionQuestionQuerySchema } from '@/lib/core/schemas/common'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import { getAnswerSelectionCount } from '@/lib/modules/quiz/utils/question-selection-helper'

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
function formatSessionPayload(session: any, quiz: any, categoryName: string, totalQuestions: number) {
  return {
    _id: session._id,
    mode: session.mode,
    status: session.status,
    current_question_index: session.current_question_index,
    totalQuestions,
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
  }
}

function formatQuestionResponse(
  rawQuestion: IQuestion,
  shouldShowAnswers: boolean,
  usageInfo?: { usage_count: number; used_in_quizzes: string[] }
) {
  const base = {
    _id: rawQuestion._id,
    text: rawQuestion.text,
    options: rawQuestion.options,
    answer_selection_count: getAnswerSelectionCount(rawQuestion),
    usage_count: usageInfo?.usage_count ?? 1,
    used_in_quizzes: usageInfo?.used_in_quizzes ?? [],
    ...(rawQuestion.image_url ? { image_url: rawQuestion.image_url } : {}),
  }
  if (shouldShowAnswers) {
    return {
      ...base,
      correct_answer: rawQuestion.correct_answer,
      explanation: rawQuestion.explanation,
    }
  }
  return base
}

function resolveQuestionOrderAndTotal(quiz: any, session: any) {
  let questionOrder = session.question_order
  let sessionTotalQuestions = questionOrder?.length || 0

  if (!questionOrder || questionOrder.length === 0) {
    const totalQ = (quiz.question_refs?.length) || (quiz.questions?.length) || 0
    questionOrder = Array.from({ length: totalQ }, (_, i) => i)
    sessionTotalQuestions = totalQ
  }
  return { questionOrder, sessionTotalQuestions }
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

    const quiz = await Quiz.findById(session.quiz_id)
      .select('course_code title category_id questions question_refs').lean() as any
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const { questionOrder, sessionTotalQuestions } = resolveQuestionOrderAndTotal(quiz, session)

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
      return NextResponse.json({
        session: formatSessionPayload(session, quiz, categoryName, sessionTotalQuestions),
        question: null,
      }, { status: 200 })
    }

    const actualQuestionIndex = questionOrder[currentIndex]

    // Parallelize category resolution & question fetching (async-parallel)
    let rawQuestion: IQuestion | null = null
    if (session.questions_cache && session.questions_cache.length > 0 && session.questions_cache[actualQuestionIndex]) {
      rawQuestion = session.questions_cache[actualQuestionIndex] as unknown as IQuestion
    }

    const [categoryName, fetchedQuestion] = await Promise.all([
      resolveCategoryName(quiz.category_id),
      rawQuestion ? Promise.resolve(rawQuestion) : resolveQuestion(quiz, actualQuestionIndex),
    ])
    rawQuestion = fetchedQuestion

    if (!rawQuestion) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const questionId = (rawQuestion as any).question_id || generateQuestionId(rawQuestion as any)
    const usageInfo = questionId
      ? await QuestionUsageService.getQuestionPublicUsage(questionId)
      : { count: 0, quizzes: [] }

    const isCompleted = session.status === 'completed'
    const isFlashcardMode = session.mode === 'flashcard'
    const isImmediateMode = session.mode === 'immediate'
    const isQuestionAnswered = (session.user_answers || []).some(
      (ua: any) => ua.question_index === currentIndex
    )
    const shouldShowAnswers = isCompleted || isFlashcardMode || (isImmediateMode && isQuestionAnswered)

    return NextResponse.json({
      session: formatSessionPayload(session, quiz, categoryName, sessionTotalQuestions),
      question: formatQuestionResponse(rawQuestion, shouldShowAnswers, {
        usage_count: usageInfo.count,
        used_in_quizzes: usageInfo.quizzes,
      }),
    }, { status: 200 })
  } catch (err) {
    console.error('GET /api/sessions/[id] error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'], allowGuest: true })

/**
 * DELETE /api/sessions/[id]
 * Delete a specific quiz session belonging to the authenticated student or guest.
 * If the session is temporary (is_temp: true), also deletes the temporary quiz.
 */
export const DELETE = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const validation = await validateQuizSessionRequest(id, payload, { checkExpired: false })
    if (!validation.isValid) return validation.response

    const deleteFilter: Record<string, any> = { _id: id }
    if (payload.userId) {
      deleteFilter.student_id = payload.userId
    }

    const session = await QuizSession.findOneAndDelete(deleteFilter).lean() as any

    if (session && session.is_temp && session.quiz_id) {
      await Quiz.findOneAndDelete({
        _id: session.quiz_id,
        is_temp: true,
      })
    }

    return NextResponse.json({ success: true, message: 'Session deleted' }, { status: 200 })
  } catch (err) {
    console.error('DELETE /api/sessions/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'], allowGuest: true })
