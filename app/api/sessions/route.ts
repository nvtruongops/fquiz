import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import mongoose from 'mongoose'
import type { IQuestion } from '@/types/quiz'
import { CreateSessionSchema } from '@/lib/schemas'
import { syncUniqueStudentCount } from '@/lib/quiz-engine'

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

export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (payload.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const quizId = searchParams.get('quiz_id')
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return NextResponse.json({ assessmentSession: null, learningSession: null })
    }

    await connectDB()
    const nowDate = new Date()
    const studentObjectId = new mongoose.Types.ObjectId(payload.userId)

    // Find all active sessions for this quiz (max 2: 1 assessment + 1 learning)
    const activeSessions = await QuizSession.find({
      student_id: studentObjectId,
      quiz_id: new mongoose.Types.ObjectId(quizId),
      status: 'active',
      expires_at: { $gt: nowDate },
    })
      .sort({ started_at: -1 })
      .lean() as any[]

    if (!activeSessions || activeSessions.length === 0) {
      return NextResponse.json({ assessmentSession: null, learningSession: null })
    }

    // Get quiz to retrieve totalQuestions
    const quiz = await Quiz.findById(quizId).select('questions').lean()
    const totalQuestions = (quiz?.questions ?? []).length

    // Separate sessions by group
    const ASSESSMENT_MODES = ['immediate', 'review']
    const LEARNING_MODES = ['flashcard']

    const assessmentSession = activeSessions.find(s => ASSESSMENT_MODES.includes(s.mode))
    const learningSession = activeSessions.find(s => LEARNING_MODES.includes(s.mode))

    const formatSession = (session: any) => {
      if (!session) return null
      const uniqueAnswered = new Set(
        (session.user_answers ?? [])
          .map((a: any) => a.question_index)
          .filter((idx: unknown): idx is number => Number.isInteger(idx) && (idx as number) >= 0)
      )
      return {
        sessionId: session._id,
        mode: session.mode,
        difficulty: session.difficulty,
        current_question_index: session.current_question_index,
        totalQuestions: totalQuestions,
        answeredCount: uniqueAnswered.size,
        started_at: session.started_at,
      }
    }

    return NextResponse.json({
      assessmentSession: formatSession(assessmentSession),
      learningSession: formatSession(learningSession),
    })
  } catch (err) {
    console.error('GET /api/sessions error:', err)
    return NextResponse.json({ assessmentSession: null, learningSession: null })
  }
}/**
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
      .select('questions original_quiz_id created_by is_public status is_saved_from_explore')
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

    const effectiveQuizObjectId = new mongoose.Types.ObjectId(effectiveQuizId)

    // Define mode groups
    const ASSESSMENT_MODES = ['immediate', 'review']
    const LEARNING_MODES = ['flashcard']
    const currentModeGroup = LEARNING_MODES.includes(mode) ? 'learning' : 'assessment'

    // Expired cleanup and active lookup are independent and can run in parallel.
    const [, activeSessions] = await Promise.all([
      QuizSession.deleteMany({
        student_id: studentObjectId,
        quiz_id: effectiveQuizObjectId,
        status: 'active',
        expires_at: { $lte: nowDate },
      }),
      QuizSession.find({
        student_id: studentObjectId,
        quiz_id: effectiveQuizObjectId,
        status: 'active',
        expires_at: { $gt: nowDate },
      })
        .sort({ started_at: -1, _id: -1 })
        .lean(),
    ])

    // Find active session in the same group
    const activeSessionInGroup = (activeSessions as any[])?.find((s: any) => {
      if (currentModeGroup === 'learning') {
        return LEARNING_MODES.includes(s.mode)
      } else {
        return ASSESSMENT_MODES.includes(s.mode)
      }
    })

    if (activeSessionInGroup && action !== 'continue' && action !== 'restart') {
      const uniqueAnswered = new Set(
        (activeSessionInGroup.user_answers ?? [])
          .map((answer: { question_index?: number }) => answer.question_index)
          .filter((idx: unknown): idx is number => Number.isInteger(idx as number) && (idx as number) >= 0)
      )

      return NextResponse.json(
        {
          error: `Bạn có một bài ${currentModeGroup === 'learning' ? 'lật thẻ' : 'quiz'} chưa hoàn thành.`,
          code: 'ACTIVE_SESSION_EXISTS',
          activeSession: {
            sessionId: activeSessionInGroup._id,
            mode: activeSessionInGroup.mode,
            difficulty: activeSessionInGroup.difficulty,
            current_question_index: activeSessionInGroup.current_question_index,
            totalQuestions: quizQuestions.length,
            answeredCount: uniqueAnswered.size,
            started_at: activeSessionInGroup.started_at,
          },
        },
        { status: 409 }
      )
    }

    if (activeSessionInGroup && action === 'continue') {
      const currentIndex =
        Number.isInteger(activeSessionInGroup.current_question_index) && activeSessionInGroup.current_question_index >= 0
          ? activeSessionInGroup.current_question_index
          : 0
      const safeIndex = Math.min(currentIndex, Math.max(quizQuestions.length - 1, 0))

      return NextResponse.json(
        {
          sessionId: activeSessionInGroup._id,
          mode: activeSessionInGroup.mode,
          difficulty: activeSessionInGroup.difficulty,
          resumed: true,
          totalQuestions: quizQuestions.length,
          currentQuestionIndex: safeIndex,
        },
        { status: 200 }
      )
    }

    if (activeSessionInGroup && action === 'restart') {
      // Delete only the session in the same group
      await QuizSession.deleteOne({ _id: activeSessionInGroup._id })
      // Return empty response to trigger mode selection dialog
      return NextResponse.json({}, { status: 200 })
    }

    // 5. Create QuizSession
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // now + 24h

    // Generate question order based on difficulty
    const questionOrder = difficulty === 'random'
      ? shuffleArray([...Array(quizQuestions.length).keys()])
      : Array.from({ length: quizQuestions.length }, (_, i) => i)

    // Initialize flashcard stats if mode is flashcard
    const flashcardStats = mode === 'flashcard' ? {
      total_cards: quizQuestions.length,
      cards_known: 0,
      cards_unknown: 0,
      time_spent_ms: 0,
      current_round: 1,
    } : undefined

    const session = await QuizSession.create({
      student_id: studentObjectId,
      quiz_id: effectiveQuizObjectId,
      mode,
      difficulty,
      status: 'active',
      current_question_index: 0,
      question_order: questionOrder,
      user_answers: [],
      score: 0,
      flashcard_stats: flashcardStats,
      expires_at: expiresAt,
      started_at: now,
      last_activity_at: now,
      paused_at: null,
      total_paused_duration_ms: 0,
    })

    // Sync student count ngay khi tạo session (tính ngay khi user bắt đầu làm)
    await syncUniqueStudentCount(effectiveQuizObjectId)

    return NextResponse.json(
      {
        sessionId: session._id,
        mode: session.mode,
        difficulty: session.difficulty,
        totalQuestions: quizQuestions.length,
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
