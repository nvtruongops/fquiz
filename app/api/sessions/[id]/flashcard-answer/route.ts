import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
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

export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })

    const body = await req.json().catch(() => null)
    const parsed = FlashcardAnswerSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })

    await connectDB()
    
    // First read for validation (lean for performance)
    const session = await QuizSession.findById(id).lean()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    const validationError = validateFlashcardSession(session, payload.userId)
    if (validationError) return NextResponse.json(validationError, { status: validationError.status })

    const { knows, question_index } = parsed.data
    const currentIndex = question_index ?? session.current_question_index
    
    // Initialize flashcard_stats if missing (should be set on session creation, but defensive)
    if (!session.flashcard_stats) {
      await QuizSession.findByIdAndUpdate(id, {
        $set: { flashcard_stats: { total_cards: session.question_order.length, cards_known: 0, cards_unknown: 0, time_spent_ms: 0, current_round: 1 } }
      })
    }

    // Check if we are updating a previous answer
    if (question_index !== undefined && question_index < session.current_question_index) {
      // [SECURITY FIX]: Atomic update with $elemMatch to prevent race condition
      // Only update if is_correct differs from knows (prevents redundant updates)
      const statsDelta = knows ? { cards_known: 1, cards_unknown: -1 } : { cards_known: -1, cards_unknown: 1 }
      const updated = await QuizSession.findOneAndUpdate(
        { 
          _id: id,
          user_answers: { 
            $elemMatch: { 
              question_index: question_index, 
              is_correct: { $ne: knows } 
            } 
          }
        },
        {
          $set: { 'user_answers.$.is_correct': knows },
          $inc: {
            'flashcard_stats.cards_known': statsDelta.cards_known,
            'flashcard_stats.cards_unknown': statsDelta.cards_unknown
          }
        },
        { new: true }
      ).lean()
      
      if (updated) {
        // Successfully updated
        return NextResponse.json({ 
          success: true, knows, isLastQuestion: false, nextQuestionIndex: updated.current_question_index, 
          stats: { total: updated.flashcard_stats?.total_cards, known: updated.flashcard_stats?.cards_known, unknown: updated.flashcard_stats?.cards_unknown } 
        })
      }
      
      // No match: either answer doesn't exist or is_correct already equals knows
      // Fetch current state to return accurate data
      const freshSession = await QuizSession.findById(id).lean()
      if (!freshSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      
      const existingAnswer = freshSession.user_answers.find(a => a.question_index === question_index)
      if (!existingAnswer) {
        return NextResponse.json({ error: 'Answer not found for this question index' }, { status: 404 })
      }
      
      return NextResponse.json({ 
        success: true, knows: existingAnswer.is_correct, isLastQuestion: false, nextQuestionIndex: freshSession.current_question_index, 
        stats: { total: freshSession.flashcard_stats?.total_cards, known: freshSession.flashcard_stats?.cards_known, unknown: freshSession.flashcard_stats?.cards_unknown } 
      })
    }

    // [SECURITY FIX]: Atomic update to prevent TOCTOU race condition for new answers
    const nextIndex = currentIndex + 1
    const isLast = nextIndex >= session.question_order.length
    
    const updated = await QuizSession.findOneAndUpdate(
      {
        _id: id,
        status: 'active',
        'user_answers.question_index': { $ne: currentIndex }
      },
      {
        $push: { user_answers: { question_index: currentIndex, answer_index: -1, is_correct: knows } },
        $set: {
          current_question_index: nextIndex,
          last_activity_at: new Date(),
          ...(isLast ? { status: 'completed', completed_at: new Date(), expires_at: null } : {})
        },
        $inc: {
          'flashcard_stats.cards_known': knows ? 1 : 0,
          'flashcard_stats.cards_unknown': knows ? 0 : 1
        }
      },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: 'This flashcard has already been answered or session is not active' }, { status: 400 })
    }

    // Fetch quiz data for response
    const quiz = await Quiz.findById(updated.quiz_id).populate('category_id', 'name').select('title course_code questions category_id').lean() as any
    const nextQ = (!isLast && quiz) ? getNextQuestion(quiz, updated, nextIndex) : null

    return NextResponse.json({
      success: true, knows, isLastQuestion: isLast, nextQuestionIndex: isLast ? null : nextIndex,
      stats: { total: updated.flashcard_stats?.total_cards ?? 0, known: updated.flashcard_stats?.cards_known ?? 0, unknown: updated.flashcard_stats?.cards_unknown ?? 0 },
      updatedData: quiz ? {
        session: {
          _id: updated._id, mode: updated.mode, status: updated.status, current_question_index: updated.current_question_index,
          totalQuestions: updated.question_order?.length || quiz.questions.length, user_answers: updated.user_answers,
          courseCode: quiz.course_code, categoryName: (quiz.category_id as any)?.name || 'Chưa phân loại', title: quiz.title,
          started_at: updated.started_at, paused_at: updated.paused_at, total_paused_duration_ms: updated.total_paused_duration_ms, flashcard_stats: updated.flashcard_stats,
        },
        question: nextQ
      } : undefined
    })
  } catch (err) {
    console.error('POST /api/sessions/[id]/flashcard-answer error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })