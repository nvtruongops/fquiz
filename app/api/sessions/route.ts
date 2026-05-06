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
    /* eslint-disable security/detect-object-injection */
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    /* eslint-enable security/detect-object-injection */
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
      $or: [
        { expires_at: { $gt: nowDate } },
        { expires_at: { $exists: false } }, // flashcard sessions have no expiry
      ],
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
async function resolveEffectiveQuiz(quiz: any) {
  if (quiz.questions?.length > 0) return { id: quiz._id, questions: quiz.questions }
  if (quiz.original_quiz_id && mongoose.Types.ObjectId.isValid(quiz.original_quiz_id.toString())) {
    const original = await Quiz.findById(quiz.original_quiz_id).select('questions status is_public').lean() as any
    if (original && original.status === 'published' && original.is_public && original.questions?.length > 0) {
      return { id: original._id, questions: original.questions }
    }
  }
  return null
}

function handleSessionConflicts(session: any, questions: any[], action: string | undefined, group: string) {
  if (action === 'continue') {
    const safeIdx = Math.min(session.current_question_index ?? 0, Math.max(questions.length - 1, 0))
    return NextResponse.json({ sessionId: session._id, mode: session.mode, difficulty: session.difficulty, resumed: true, totalQuestions: questions.length, currentQuestionIndex: safeIdx })
  }
  if (action === 'restart') return null // Signal to delete and restart

  const answered = new Set((session.user_answers ?? []).map((a: any) => a.question_index).filter((idx: any) => Number.isInteger(idx) && idx >= 0)).size
  return NextResponse.json({ error: `Bạn có một bài ${group === 'learning' ? 'lật thẻ' : 'quiz'} chưa hoàn thành.`, code: 'ACTIVE_SESSION_EXISTS', activeSession: { sessionId: session._id, mode: session.mode, difficulty: session.difficulty, current_question_index: session.current_question_index, totalQuestions: questions.length, answeredCount: answered, started_at: session.started_at } }, { status: 409 })
}

export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload || payload.role !== 'student') return NextResponse.json({ error: payload ? 'Forbidden' : 'Unauthorized' }, { status: payload ? 403 : 401 })

    const body = await req.json().catch(() => null)
    const parsed = CreateSessionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })

    const { quiz_id, mode, difficulty, action } = parsed.data
    await connectDB()

    const quiz = await Quiz.findById(quiz_id).select('questions original_quiz_id created_by is_public status is_saved_from_explore').lean() as any
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const isOwner = quiz.created_by?.toString() === payload.userId
    if (!isOwner && !(quiz.is_public && quiz.status === 'published')) {
      return NextResponse.json({ error: 'Quiz này đã được Admin đóng. Vui lòng thực hiện lại sau.' }, { status: 403 })
    }

    const effective = await resolveEffectiveQuiz(quiz)
    if (!effective) return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 })

    const studentId = new mongoose.Types.ObjectId(payload.userId)
    const modeGroup = ['flashcard'].includes(mode) ? 'learning' : 'assessment'
    const groupModes = modeGroup === 'learning' ? ['flashcard'] : ['immediate', 'review']

    const activeSessions = await QuizSession.find({ student_id: studentId, quiz_id: effective.id, status: 'active', $or: [{ expires_at: { $gt: new Date() } }, { expires_at: { $exists: false } }] }).sort({ started_at: -1 }).lean() as any[]
    const groupSession = activeSessions.find(s => groupModes.includes(s.mode))

    if (groupSession) {
      const conflictRes = handleSessionConflicts(groupSession, effective.questions, action, modeGroup)
      if (conflictRes) return conflictRes
      await QuizSession.deleteOne({ _id: groupSession._id })
      if (action === 'restart') return NextResponse.json({}, { status: 200 })
    }

    await QuizSession.deleteMany({ student_id: studentId, quiz_id: effective.id, mode: { $in: groupModes } })

    const now = new Date()
    const questionOrder = difficulty === 'random' ? shuffleArray([...Array(effective.questions.length).keys()]) : Array.from({ length: effective.questions.length }, (_, i) => i)
    const session = await QuizSession.create({
      student_id: studentId, quiz_id: effective.id, mode, difficulty, status: 'active', current_question_index: 0, question_order: questionOrder, user_answers: [], score: 0,
      flashcard_stats: mode === 'flashcard' ? { total_cards: effective.questions.length, cards_known: 0, cards_unknown: 0, time_spent_ms: 0, current_round: 1 } : undefined,
      expires_at: mode === 'flashcard' ? undefined : new Date(now.getTime() + 86400000), started_at: now, last_activity_at: now, total_paused_duration_ms: 0
    })

    await syncUniqueStudentCount(effective.id)
    return NextResponse.json({ sessionId: session._id, mode: session.mode, difficulty: session.difficulty, totalQuestions: effective.questions.length }, { status: 201 })
  } catch (err) {
    console.error('POST /api/sessions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
