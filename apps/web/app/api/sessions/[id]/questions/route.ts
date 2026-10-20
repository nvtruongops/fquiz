import { NextResponse } from 'next/server'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionUsageService } from '@/lib/modules/quiz/services/question-usage.service'
import { getSessionRequestErrorResponse, resolveEffectiveQuestionDeck, validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import { getAnswerSelectionCount } from '@/lib/modules/quiz/utils/question-selection-helper'

/**
 * GET /api/sessions/[id]/questions
 * Returns all questions for a quiz session based on mode.
 * - Immediate mode: includes correct_answer and explanation
 * - Review mode: excludes correct_answer and explanation
 * Requirements: 6.1, 12.1, 12.3
 */
async function getQuestionUsageMap(
  session: { status: string; mode: string },
  questionOrder: number[],
  rawQuestions: Array<any | null>,
  courseCode?: string
) {
  if (session.status === 'active' && session.mode !== 'flashcard') {
    return new Map<string, { count: number; quizzes: string[] }>()
  }

  const questionQueries = questionOrder.map((i) => rawQuestions[i]).filter(Boolean).map((q) => {
    return { question_id: q?.question_id, text: q?.text }
  })
  return QuestionUsageService.getBatchQuestionPublicUsage(questionQueries, courseCode)
}

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
        error: 'Session has ended automatically.',
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

    const isFromSessionCache = Array.isArray(session.questions_cache) && session.questions_cache.length > 0
    const isFromEmbeddedQuiz = !isFromSessionCache && (!Array.isArray(quiz.question_refs) || quiz.question_refs.length === 0)
    const { questions: rawQuestions, questionOrder } = await resolveEffectiveQuestionDeck(session, quiz)

    // Ensure all questions have a question_id (generate if missing)
    let hasMissingId = false
    for (const q of rawQuestions) {
      if (q && !q.question_id) {
        q.question_id = generateQuestionId(q)
        hasMissingId = true
      }
    }
    // Auto-repair DB if any question is missing question_id (only when rawQuestions is from root Quiz)
    if (hasMissingId && isFromEmbeddedQuiz && Array.isArray(quiz.questions) && quiz.questions.length === rawQuestions.length) {
      await Quiz.updateOne({ _id: session.quiz_id }, { $set: { questions: rawQuestions } })
    }

    // Active multiple-choice sessions don't need the optional usage badge metadata.
    // Keep the lookup for completed sessions and flashcards, where that context remains visible.
    const usageMap = await getQuestionUsageMap(session, questionOrder, rawQuestions, quiz?.course_code)

    // Set of display indexes that have already been answered by the student
    const answeredDisplayIndexes = new Set(
      (session.user_answers || []).map((ua: any) => ua.question_index)
    )

    // For immediate mode (only already answered) or completed/flashcard sessions: include correct_answer and explanation
    // Otherwise: exclude correct_answer and explanation
    const questions = questionOrder.map((originalIndex: number, displayIndex: number) => {
      const q: any = rawQuestions[originalIndex] ?? {}

      const baseQuestion = {
        _id: q._id,
        text: q.text,
        options: q.options,
        answer_selection_count: getAnswerSelectionCount(q),
        ...(q.image_url ? { image_url: q.image_url } : {}),
      }

      const isQuestionAnswered = answeredDisplayIndexes.has(displayIndex)
      const usageInfo = q.question_id
        ? usageMap.get(q.question_id)
        : (q.text ? usageMap.get(q.text) : undefined)

      const questionWithUsage = {
        ...baseQuestion,
        usage_count: usageInfo?.count ?? 0,
        used_in_quizzes: usageInfo?.quizzes ?? [],
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
    return getSessionRequestErrorResponse(err)
  }
}, { roles: ['student'], allowGuest: true })
