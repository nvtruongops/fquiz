import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { UserHighlight } from '@/models/UserHighlight'
import mongoose from 'mongoose'
import type { IQuestion } from '@/types/quiz'
import { CreateSessionSchema } from '@/lib/schemas'

/**
 * Fisher-Yates shuffle algorithm for randomizing question order
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function GET() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}

/**
 * POST /api/sessions
 * Creates a new quiz session for a student.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.1
 */
export async function POST(req: Request) {
  try {
    // 1. Validate Student JWT
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (payload.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate with schema
    const parsed = CreateSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { quiz_id, mode, difficulty, action } = parsed.data

    // 3. Connect to DB
    await connectDB()

    // 4. Find requested quiz
    const requestedQuiz = await Quiz.findById(quiz_id)
      .select('questions original_quiz_id created_by is_public status')
      .lean()
    if (!requestedQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const isOwner = requestedQuiz.created_by?.toString() === payload.userId
    const isPublicPublished = requestedQuiz.is_public && requestedQuiz.status === 'published'
    if (!isOwner && !isPublicPublished) {
      return NextResponse.json(
        { error: 'Quiz này đã được Admin đóng. Vui lòng thực hiện lại sau.' },
        { status: 403 }
      )
    }

    let effectiveQuizId = requestedQuiz._id
    let quizQuestions = (requestedQuiz.questions ?? []) as IQuestion[]

    // Saved shortcut quizzes can have empty questions — fallback to original quiz.
    if (
      quizQuestions.length === 0 &&
      requestedQuiz.original_quiz_id &&
      mongoose.Types.ObjectId.isValid(requestedQuiz.original_quiz_id.toString())
    ) {
      const originalQuiz = await Quiz.findById(requestedQuiz.original_quiz_id)
        .select('questions status is_public')
        .lean()

      if (originalQuiz) {
        if (!(originalQuiz.status === 'published' && originalQuiz.is_public)) {
          return NextResponse.json(
            { error: 'Quiz này đã được Admin đóng. Vui lòng thực hiện lại sau.' },
            { status: 403 }
          )
        }

        const originalQuestions = (originalQuiz.questions ?? []) as IQuestion[]
        if (originalQuestions.length > 0) {
          effectiveQuizId = originalQuiz._id
          quizQuestions = originalQuestions
        }
      }
    }

    if (
      requestedQuiz.is_saved_from_explore === true &&
      quizQuestions.length > 0 &&
      requestedQuiz.original_quiz_id &&
      mongoose.Types.ObjectId.isValid(requestedQuiz.original_quiz_id.toString())
    ) {
      const originalQuizMeta = await Quiz.findById(requestedQuiz.original_quiz_id)
        .select('status is_public')
        .lean() as { status: string; is_public: boolean } | null

      if (originalQuizMeta && !(originalQuizMeta.status === 'published' && originalQuizMeta.is_public)) {
        return NextResponse.json(
          { error: 'Quiz này đã được Admin đóng. Vui lòng thực hiện lại sau.' },
          { status: 403 }
        )
      }
    }

    if (quizQuestions.length === 0) {
      return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 })
    }

    const studentObjectId = new mongoose.Types.ObjectId(payload.userId)
    const nowDate = new Date()

    // Cleanup expired active sessions to avoid blocking new attempts with stale rows.
    await QuizSession.deleteMany({
      student_id: studentObjectId,
      quiz_id: new mongoose.Types.ObjectId(effectiveQuizId),
      status: 'active',
      expires_at: { $lte: nowDate },
    })

    const activeSession = await QuizSession.findOne({
      student_id: studentObjectId,
      quiz_id: new mongoose.Types.ObjectId(effectiveQuizId),
      status: 'active',
      expires_at: { $gt: nowDate },
    })
      .sort({ started_at: -1, _id: -1 })
      .lean()

    if (activeSession && action !== 'continue' && action !== 'restart') {
      const uniqueAnswered = new Set(
        (activeSession.user_answers ?? [])
          .map((answer: { question_index?: number }) => answer.question_index)
          .filter((idx: unknown): idx is number => Number.isInteger(idx as number) && (idx as number) >= 0)
      )

      return NextResponse.json(
        {
          error: 'Bạn có một bài quiz chưa hoàn thành.',
          code: 'ACTIVE_SESSION_EXISTS',
          activeSession: {
            sessionId: activeSession._id,
            mode: activeSession.mode,
            difficulty: activeSession.difficulty,
            current_question_index: activeSession.current_question_index,
            totalQuestions: quizQuestions.length,
            answeredCount: uniqueAnswered.size,
            started_at: activeSession.started_at,
          },
        },
        { status: 409 }
      )
    }

    if (activeSession && action === 'continue') {
      const currentIndex =
        Number.isInteger(activeSession.current_question_index) && activeSession.current_question_index >= 0
          ? activeSession.current_question_index
          : 0
      const safeIndex = Math.min(currentIndex, Math.max(quizQuestions.length - 1, 0))
      const resumeQuestion = quizQuestions[safeIndex]
      const safeQuestion = {
        _id: resumeQuestion._id,
        text: resumeQuestion.text,
        options: resumeQuestion.options,
        ...(resumeQuestion.image_url ? { image_url: resumeQuestion.image_url } : {}),
      }

      const questionIds = quizQuestions.map((q: IQuestion) => q._id)
      const highlights = await UserHighlight.find({
        student_id: studentObjectId,
        question_id: { $in: questionIds },
      }).lean()

      return NextResponse.json(
        {
          sessionId: activeSession._id,
          mode: activeSession.mode,
          resumed: true,
          question: safeQuestion,
          highlights,
          totalQuestions: quizQuestions.length,
          currentQuestionIndex: safeIndex,
        },
        { status: 200 }
      )
    }

    if (activeSession && action === 'restart') {
      await QuizSession.deleteMany({
        student_id: studentObjectId,
        quiz_id: new mongoose.Types.ObjectId(effectiveQuizId),
        status: 'active',
      })
    }

    // 5. Create QuizSession
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // now + 24h

    // Generate question order based on difficulty
    const questionOrder = difficulty === 'random'
      ? shuffleArray([...Array(quizQuestions.length).keys()])
      : Array.from({ length: quizQuestions.length }, (_, i) => i)

    const session = await QuizSession.create({
      student_id: studentObjectId,
      quiz_id: new mongoose.Types.ObjectId(effectiveQuizId),
      mode,
      difficulty,
      status: 'active',
      current_question_index: 0,
      question_order: questionOrder,
      user_answers: [],
      score: 0,
      expires_at: expiresAt,
      started_at: now,
      last_activity_at: now,
      paused_at: null,
      total_paused_duration_ms: 0,
    })

    // 6. Query UserHighlights for all question_ids in the quiz
    const questionIds = quizQuestions.map((q: IQuestion) => q._id)
    const highlights = await UserHighlight.find({
      student_id: studentObjectId,
      question_id: { $in: questionIds },
    }).lean()

    // 7. Return first question based on question_order
    const firstQuestionIndex = questionOrder[0]
    const firstQuestion = quizQuestions[firstQuestionIndex]
    const safeQuestion = {
      _id: firstQuestion._id,
      text: firstQuestion.text,
      options: firstQuestion.options,
      ...(firstQuestion.image_url ? { image_url: firstQuestion.image_url } : {}),
    }

    // Build all questions ordered by question_order for preload (avoid separate /questions fetch)
    const orderedQuestions = questionOrder.map((originalIdx: number) => {
      const q = quizQuestions[originalIdx]
      if (!q) return null
      const base = {
        _id: q._id,
        text: q.text,
        options: q.options,
        answer_selection_count: Array.isArray(q.correct_answer) ? Math.max(q.correct_answer.length, 1) : 1,
        ...(q.image_url ? { image_url: q.image_url } : {}),
      }
      if (mode === 'immediate') {
        return { ...base, correct_answer: q.correct_answer, explanation: q.explanation }
      }
      return base
    }).filter(Boolean)

    return NextResponse.json(
      {
        sessionId: session._id,
        mode: session.mode,
        difficulty: session.difficulty,
        question: safeQuestion,
        highlights,
        totalQuestions: quizQuestions.length,
        // Include all questions so client doesn't need a separate /questions fetch
        questions: orderedQuestions,
        // Include session state so client doesn't need a separate /sessions/[id] fetch
        session: {
          _id: session._id,
          mode: session.mode,
          status: session.status,
          current_question_index: 0,
          totalQuestions: quizQuestions.length,
          user_answers: [],
          score: 0,
          courseCode: '', // will be populated by client from quiz detail
          categoryName: '',
          title: '',
          started_at: session.started_at,
          paused_at: null,
          total_paused_duration_ms: 0,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/sessions error:', err)
    // Handle DB connection failure
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
