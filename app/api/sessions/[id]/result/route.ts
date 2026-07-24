import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import type { UserAnswer } from '@/lib/modules/quiz/types/session'

/**
 * GET /api/sessions/[id]/result
 * Returns the full result for a completed quiz session.
 * Requirements: 9.3, 12.2, 12.4
 */
export const GET = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const validation = await validateQuizSessionRequest(id, payload, { checkExpired: false })
    if (!validation.isValid) return validation.response

    const session = validation.session

    // Req 12.4: return 403 if session is not completed
    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Session is not completed yet' },
        { status: 403 }
      )
    }

    const quiz = await Quiz.findById(session.quiz_id).lean()
    if (!quiz && (!session.questions_cache || session.questions_cache.length === 0)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const allQuestions = (session.questions_cache?.length
      ? session.questions_cache
      : (quiz?.questions ?? [])) as IQuestion[]
    const sessionAnswers = (session.user_answers ?? []) as UserAnswer[]
    const questionOrder = session.question_order || Array.from({ length: allQuestions.length }, (_, i) => i)

    // Build full result — include correct_answer and explanation (Req 12.2)
    // Map questions according to question_order so they appear in the same order as during the quiz
    const questions = questionOrder.map((actualIndex: number, displayIndex: number) => {
      const q = allQuestions[actualIndex] ?? allQuestions[0]
      const submitted = sessionAnswers.find((a: UserAnswer) => a.question_index === displayIndex)
      
      // Return correct_answer as-is (can be number or number[])
      const correctAnswer = q.correct_answer
      
      // Return submitted answer as-is (can be single or multiple)
      const submittedAnswer = submitted 
        ? (submitted.answer_indexes && submitted.answer_indexes.length > 0 
            ? submitted.answer_indexes 
            : submitted.answer_index)
        : null

      return {
        _id: q._id,
        text: q.text,
        options: q.options,
        correct_answer: correctAnswer,
        explanation: q.explanation,
        ...(q.image_url ? { image_url: q.image_url } : {}),
        submitted_answer: submittedAnswer,
        is_correct: submitted?.is_correct ?? false,
      }
    })

    return NextResponse.json(
      {
        sessionId: session._id,
        quizId: session.quiz_id,
        mode: session.mode,
        score: session.score,
        totalQuestions: questionOrder.length,
        completed_at: session.completed_at,
        user_answers: sessionAnswers,
        questions,
        is_temp: (session as any).is_temp ?? false,
        flashcard_stats: session.mode === 'flashcard' ? session.flashcard_stats : undefined,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('GET /api/sessions/[id]/result error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })