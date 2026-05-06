import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'
import { Category } from '@/models/Category'
import { z } from 'zod'

const FlashcardAnswerSchema = z.object({
  knows: z.boolean(),
  question_index: z.number().int().min(0).optional(),
})

/**
 * POST /api/sessions/[id]/flashcard-answer
 * Records user's self-assessment for a flashcard (knows/doesn't know)
 */
function validateFlashcardSession(session: any, userId: string) {
  if (!session) return { error: 'Session not found', status: 404 }
  if (session.student_id.toString() !== userId) return { error: 'Forbidden', status: 403 }
  if (session.mode !== 'flashcard') return { error: 'Not a flashcard session', status: 400 }
  if (session.status === 'completed') return { error: 'Session already completed', status: 409 }
  if (session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
    return { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED', status: 410 }
  }
  return null
}

function getNextQuestion(quiz: any, session: any, nextIndex: number) {
  const order = session.question_order || Array.from({ length: quiz.questions.length }, (_, i) => i)
  const raw = quiz.questions[order[nextIndex]]
  if (!raw) return null
  return {
    _id: raw._id, text: raw.text, options: raw.options, correct_answer: raw.correct_answer, explanation: raw.explanation,
    answer_selection_count: Array.isArray(raw.correct_answer) ? Math.min(Math.max(raw.correct_answer.length, 1), raw.options.length) : 1,
    ...(raw.image_url ? { image_url: raw.image_url } : {}),
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyToken(req)
    if (!payload || payload.role !== 'student') return NextResponse.json({ error: payload ? 'Forbidden' : 'Unauthorized' }, { status: payload ? 403 : 401 })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })

    const body = await req.json().catch(() => null)
    const parsed = FlashcardAnswerSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })

    await connectDB()
    const session = await QuizSession.findById(id)
    const validationError = validateFlashcardSession(session, payload.userId)
    if (validationError) return NextResponse.json(validationError, { status: validationError.status })

    const { knows, question_index } = parsed.data
    const currentIndex = question_index ?? session.current_question_index
    if (question_index !== undefined && question_index < session.current_question_index) {
      return NextResponse.json({ success: true, knows, isLastQuestion: false, nextQuestionIndex: session.current_question_index, stats: { total: session.flashcard_stats?.total_cards, known: session.flashcard_stats?.cards_known, unknown: session.flashcard_stats?.cards_unknown } })
    }

    if (!session.flashcard_stats) session.flashcard_stats = { total_cards: session.question_order.length, cards_known: 0, cards_unknown: 0, time_spent_ms: 0, current_round: 1 }
    session.user_answers.push({ question_index: currentIndex, answer_index: -1, is_correct: knows, time_taken_ms: 0 })
    if (knows) session.flashcard_stats.cards_known += 1; else session.flashcard_stats.cards_unknown += 1

    const nextIndex = currentIndex + 1
    const isLast = nextIndex >= session.question_order.length
    session.current_question_index = nextIndex
    session.last_activity_at = new Date()
    if (isLast) { session.status = 'completed'; session.completed_at = new Date(); session.expires_at = undefined }
    await session.save()

    const quiz = await Quiz.findById(session.quiz_id).populate('category_id', 'name').select('title course_code questions category_id').lean() as any
    const nextQ = (!isLast && quiz) ? getNextQuestion(quiz, session, nextIndex) : null

    return NextResponse.json({
      success: true, knows, isLastQuestion: isLast, nextQuestionIndex: isLast ? null : nextIndex,
      stats: { total: session.flashcard_stats.total_cards, known: session.flashcard_stats.cards_known, unknown: session.flashcard_stats.cards_unknown },
      updatedData: quiz ? {
        session: {
          _id: session._id, mode: session.mode, status: session.status, current_question_index: session.current_question_index,
          totalQuestions: session.question_order?.length || quiz.questions.length, user_answers: session.user_answers,
          courseCode: quiz.course_code, categoryName: (quiz.category_id as any)?.name || 'Chưa phân loại', title: quiz.title,
          started_at: session.started_at, paused_at: session.paused_at, total_paused_duration_ms: session.total_paused_duration_ms, flashcard_stats: session.flashcard_stats,
        },
        question: nextQ
      } : undefined
    })
  } catch (err) {
    console.error('POST /api/sessions/[id]/flashcard-answer error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
