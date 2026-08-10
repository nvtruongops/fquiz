import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import { getAnswerSelectionCount } from '@/lib/modules/quiz/utils/question-selection-helper'

/**
 * GET /api/sessions/[id]/questions
 * Returns all questions for a quiz session based on mode.
 * - Immediate mode: includes correct_answer and explanation
 * - Review mode: excludes correct_answer and explanation
 * Requirements: 6.1, 12.1, 12.3
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

    // Handle 'preparing' status
    if (session.status === 'preparing') {
      return NextResponse.json({ 
        error: 'Quiz is being prepared', 
        status: 'preparing' 
      }, { status: 202 })
    }

    const quiz = await Quiz.findById(session.quiz_id)
      .select('questions question_refs category_id course_code').lean() as any
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const isCompleted = session.status === 'completed'
    const isImmediateMode = session.mode === 'immediate'
    const isFlashcardMode = session.mode === 'flashcard'

    // Resolve raw questions list (cached in session, embedded in quiz, or referenced)
    let rawQuestions: any[] = []
    if (Array.isArray(session.questions_cache) && session.questions_cache.length > 0) {
      rawQuestions = session.questions_cache
    } else if (Array.isArray(quiz.questions) && quiz.questions.length > 0) {
      rawQuestions = quiz.questions
    } else if (Array.isArray(quiz.question_refs) && quiz.question_refs.length > 0) {
      const QuestionModel = (await import('@/lib/modules/quiz/models/Question')).Question
      const refDocs = await QuestionModel.find({ _id: { $in: quiz.question_refs } }).lean()
      const refMap = new Map(refDocs.map((q: any) => [q._id.toString(), q]))
      rawQuestions = quiz.question_refs.map((refId: any) => refMap.get(refId.toString())).filter(Boolean)
    }

    // Get question order (use existing or create sequential)
    const questionOrder = session.question_order || Array.from({ length: rawQuestions.length }, (_, i) => i)

    // Đảm bảo mọi câu hỏi đều có question_id (tự sinh nếu thiếu)
    let hasMissingId = false
    for (const q of rawQuestions) {
      if (q && !q.question_id) {
        q.question_id = generateQuestionId(q)
        hasMissingId = true
      }
    }
    // Tự động repair DB nếu có câu thiếu question_id (cho embedded questions)
    if (hasMissingId && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
      await Quiz.updateOne({ _id: session.quiz_id }, { $set: { questions: rawQuestions } })
    }

    // Batch lookup usage_count từ QuestionBank (nếu có category_id thì filter theo category, nếu không thì filter theo question_id)
    const questionIds = questionOrder.map((i: number) => rawQuestions[i]?.question_id).filter(Boolean)
    const usageMap = new Map<string, { count: number; quizzes: string[] }>()
    if (questionIds.length > 0) {
      const bankQuery: any = { question_id: { $in: questionIds } }
      if (quiz.category_id) {
        bankQuery.category_id = quiz.category_id
      }
      const bankDocs = await QuestionBank.find(bankQuery).select('question_id usage_count used_in_quizzes').lean()
      for (const doc of bankDocs) {
        usageMap.set(doc.question_id, {
          count: doc.usage_count || 1,
          quizzes: doc.used_in_quizzes || [],
        })
      }
    }

    // Set of display indexes that have already been answered by the student
    const answeredDisplayIndexes = new Set(
      (session.user_answers || []).map((ua: any) => ua.question_index)
    )

    const defaultQuizzesFallback = quiz.course_code ? [quiz.course_code] : []

    // For immediate mode (only already answered) or completed/flashcard sessions: include correct_answer and explanation
    // Otherwise: exclude correct_answer and explanation
    const questions = questionOrder.map((originalIndex: number, displayIndex: number) => {
      const q = rawQuestions[originalIndex] ?? rawQuestions[0] ?? {}

      const baseQuestion = {
        _id: q._id,
        text: q.text,
        options: q.options,
        answer_selection_count: getAnswerSelectionCount(q),
        ...(q.image_url ? { image_url: q.image_url } : {}),
      }

      const isQuestionAnswered = answeredDisplayIndexes.has(displayIndex)
      const usageInfo = q.question_id ? usageMap.get(q.question_id) : undefined

      const questionWithUsage = {
        ...baseQuestion,
        usage_count: usageInfo?.count ?? 1,
        used_in_quizzes: usageInfo?.quizzes?.length ? usageInfo.quizzes : defaultQuizzesFallback,
      }

      // Include answers for immediate mode (only if already answered), completed sessions, or flashcard mode
      if (isCompleted || isFlashcardMode || (isImmediateMode && isQuestionAnswered)) {
        return {
          ...questionWithUsage,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        }
      }

      // Review mode (active) or unanswered immediate questions: exclude answers
      return questionWithUsage
    })

    return NextResponse.json(
      {
        sessionId: session._id,
        mode: session.mode,
        difficulty: session.difficulty,
        status: session.status,
        totalQuestions: questions.length,
        questions,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('GET /api/sessions/[id]/questions error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })