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
export async function POST(
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

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = FlashcardAnswerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { knows, question_index } = parsed.data

    await connectDB()

    const session = await QuizSession.findById(id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify session belongs to the requesting student
    if (session.student_id.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify this is a flashcard session
    if (session.mode !== 'flashcard') {
      return NextResponse.json({ error: 'Not a flashcard session' }, { status: 400 })
    }

    if (session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
        { status: 410 }
      )
    }

    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }

    // Initialize flashcard_stats if not exists
    if (!session.flashcard_stats) {
      session.flashcard_stats = {
        total_cards: session.question_order.length,
        cards_known: 0,
        cards_unknown: 0,
        time_spent_ms: 0,
        current_round: 1,
      }
    }

    // Determine the current question index
    const currentIndex = question_index ?? session.current_question_index
    
    // Guard against concurrent, repeated submissions for an already completed index!
    if (question_index !== undefined && question_index < session.current_question_index) {
      // The user mashed the button and a duplicate request arrived later.
      // Do NOT increment stats or advance index. Return success silently.
      return NextResponse.json({
        success: true,
        knows,
        isLastQuestion: false,
        nextQuestionIndex: session.current_question_index,
        stats: {
          total: session.flashcard_stats.total_cards,
          known: session.flashcard_stats.cards_known,
          unknown: session.flashcard_stats.cards_unknown,
        },
      })
    }

    // Update statistics and record answer for future review
    if (!Array.isArray(session.user_answers)) {
      session.user_answers = []
    }
    
    // In flashcard mode: is_correct tracks 'known'
    session.user_answers.push({
      question_index: currentIndex,
      answer_index: -1, // Not applicable
      is_correct: knows,
      time_taken_ms: 0,
    })

    if (knows) {
      session.flashcard_stats.cards_known += 1
    } else {
      session.flashcard_stats.cards_unknown += 1
    }

    // Move to next question
    const nextIndex = currentIndex + 1
    const isLastQuestion = nextIndex >= session.question_order.length

    session.current_question_index = nextIndex
    session.last_activity_at = new Date()

    // If completed, mark as completed
    if (isLastQuestion) {
      session.status = 'completed'
      session.completed_at = new Date()
      session.expires_at = undefined // Keep in history
    }

    await session.save()

    // Prepare full return data to avoid extra GET request on the frontend!
    const quiz = await Quiz.findById(session.quiz_id).populate('category_id').lean()
    const category = quiz?.category_id

    let nextQuestion = null
    if (!isLastQuestion && quiz) {
      const questionOrder = session.question_order || Array.from({ length: quiz.questions.length }, (_, i) => i)
      const actualNextIndex = questionOrder[nextIndex]
      const rawQuestion = quiz.questions[actualNextIndex]
      
      if (rawQuestion) {
        nextQuestion = {
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
      }
    }

    return NextResponse.json({
      success: true,
      knows,
      isLastQuestion,
      nextQuestionIndex: isLastQuestion ? null : nextIndex,
      stats: {
        total: session.flashcard_stats.total_cards,
        known: session.flashcard_stats.cards_known,
        unknown: session.flashcard_stats.cards_unknown,
      },
      // Include full optimized payload so UI can skip GET request!
      updatedData: quiz ? {
        session: {
          _id: session._id,
          mode: session.mode,
          status: session.status,
          current_question_index: session.current_question_index,
          totalQuestions: session.question_order?.length || quiz.questions.length,
          user_answers: session.user_answers,
          courseCode: quiz.course_code,
          categoryName: category?.name || 'Chưa phân loại',
          title: quiz.title,
          started_at: session.started_at,
          paused_at: session.paused_at,
          total_paused_duration_ms: session.total_paused_duration_ms,
          flashcard_stats: session.flashcard_stats,
        },
        question: nextQuestion
      } : undefined
    })
  } catch (err) {
    console.error('POST /api/sessions/[id]/flashcard-answer error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
