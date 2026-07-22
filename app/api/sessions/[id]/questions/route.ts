import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'

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
    
    // Check if session has expired or been paused for more than 5 minutes
    const AUTO_PAUSE_THRESHOLD_MS = 5 * 60 * 1000
    const isPausedTooLong = session.paused_at && (Date.now() - new Date(session.paused_at).getTime() >= AUTO_PAUSE_THRESHOLD_MS)
    if (session.status === 'expired' || isPausedTooLong) {
      if (session.status !== 'expired') {
        const { QuizSession } = await import('@/lib/modules/quiz/models/QuizSession')
        await QuizSession.updateOne({ _id: session._id }, { $set: { status: 'expired', paused_at: null } })
      }
      return NextResponse.json({
        error: 'Phiên làm bài đã tự động kết thúc do bạn tạm dừng hoặc rời trang quá 5 phút.',
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

    const quiz = await Quiz.findById(session.quiz_id).select('questions category_id').lean()
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const isCompleted = session.status === 'completed'
    const isImmediateMode = session.mode === 'immediate'
    const isFlashcardMode = session.mode === 'flashcard'

    // Get question order (use existing or create sequential)
    const questionOrder = session.question_order || Array.from({ length: quiz.questions.length }, (_, i) => i)

    // Đảm bảo mọi câu hỏi đều có question_id (tự sinh nếu thiếu)
    let hasMissingId = false
    for (const q of quiz.questions) {
      if (!q.question_id) {
        q.question_id = generateQuestionId(q)
        hasMissingId = true
      }
    }
    // Tự động repair DB nếu có câu thiếu question_id
    if (hasMissingId) {
      await Quiz.updateOne({ _id: session.quiz_id }, { $set: { questions: quiz.questions } })
    }

    // Batch lookup usage_count từ QuestionBank
    const questionIds = questionOrder.map((i: number) => quiz.questions[i]?.question_id).filter(Boolean)
    const usageMap = new Map<string, number>()
    if (questionIds.length > 0 && quiz.category_id) {
      const bankDocs = await QuestionBank.find({
        category_id: quiz.category_id,
        question_id: { $in: questionIds },
      }).select('question_id usage_count').lean()
      for (const doc of bankDocs) {
        usageMap.set(doc.question_id, doc.usage_count)
      }
    }

    // Set of display indexes that have already been answered by the student
    const answeredDisplayIndexes = new Set(
      (session.user_answers || []).map((ua: any) => ua.question_index)
    )

    // For immediate mode (only already answered) or completed/flashcard sessions: include correct_answer and explanation
    // Otherwise: exclude correct_answer and explanation
    const questions = questionOrder.map((originalIndex: number, displayIndex: number) => {
      const q = (session.questions_cache && session.questions_cache.length > 0 && session.questions_cache[originalIndex])
        ? session.questions_cache[originalIndex]
        : (quiz.questions[originalIndex] ?? quiz.questions[0])

      const baseQuestion = {
        _id: q._id,
        text: q.text,
        options: q.options,
        answer_selection_count: Array.isArray(q.correct_answer)
          ? Math.min(Math.max(q.correct_answer.length, 1), q.options.length)
          : 1,
        ...(q.image_url ? { image_url: q.image_url } : {}),
      }

      const isQuestionAnswered = answeredDisplayIndexes.has(displayIndex)

      const questionWithUsage = {
        ...baseQuestion,
        usage_count: q.question_id ? (usageMap.get(q.question_id) ?? 0) : 0,
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