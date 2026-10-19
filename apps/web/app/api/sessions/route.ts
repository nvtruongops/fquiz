import { NextResponse } from 'next/server'
import { GUEST_ID_COOKIE_NAME } from '@fquiz/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Category } from '@/lib/modules/quiz/models/Category'
import mongoose from 'mongoose'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import { CreateSessionSchema } from '@/lib/modules/quiz/schemas/quiz'
import { syncUniqueStudentCount } from '@/lib/modules/quiz/quiz-engine'
import { providerFactory } from '@/lib/core/security/rate-limit/provider'
import { secureShuffle, shuffleQuestionOptions } from '@/lib/core/utils/shuffle'
import { getAnswerSelectionCount } from '@/lib/modules/quiz/utils/question-selection-helper'


export const GET = withAuth(async (req, { payload }) => {
  try {
    if (!payload.userId) {
      return NextResponse.json({ assessmentSession: null, learningSession: null })
    }

    const { searchParams } = new URL(req.url, 'http://localhost')
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
}, { roles: ['student'], allowGuest: true })

/**
 * POST /api/sessions
 * Creates a new quiz session for a student or anonymous guest.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.1
 */
async function resolveEffectiveQuiz(quiz: any) {
  if (quiz.questions?.length > 0) return { id: quiz._id, questions: quiz.questions }
  if (quiz.question_refs?.length > 0) {
    const { Question } = await import('@/lib/modules/quiz/models/Question')
    const refDocs = await Question.find({ _id: { $in: quiz.question_refs } }).lean()
    const docMap = new Map(refDocs.map((d: any) => [d._id.toString(), d]))
    const orderedQuestions = quiz.question_refs.map((id: any) => docMap.get(id.toString())).filter(Boolean)
    if (orderedQuestions.length > 0) return { id: quiz._id, questions: orderedQuestions }
  }
  if (quiz.original_quiz_id && mongoose.Types.ObjectId.isValid(quiz.original_quiz_id.toString())) {
    const original = await Quiz.findById(quiz.original_quiz_id).select('questions question_refs status is_public').lean() as any
    if (original && original.status === 'published' && original.is_public) {
      return resolveEffectiveQuiz(original)
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
  return NextResponse.json({ error: `You have an unfinished ${group === 'learning' ? 'flashcard' : 'quiz'} session.`, code: 'ACTIVE_SESSION_EXISTS', activeSession: { sessionId: session._id, mode: session.mode, difficulty: session.difficulty, current_question_index: session.current_question_index, totalQuestions: questions.length, answeredCount: answered, started_at: session.started_at } }, { status: 409 })
}

const sessionLimiter = providerFactory.createProvider(10, 60 * 1000)

export const POST = withAuth(async (req, { payload }) => {
  try {
    const rateLimitKey = payload.userId || req.headers.get('x-forwarded-for') || 'guest_client'
    const rateLimitResult = await sessionLimiter.check(rateLimitKey)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many session creation requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString()
          }
        }
      )
    }

    const body = await req.json().catch(() => null)
    const parsed = CreateSessionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })

    const { quiz_id, mode, difficulty, action, shuffle_options } = parsed.data
    await connectDB()

    const quiz = await Quiz.findById(quiz_id).select('questions original_quiz_id created_by is_public status is_saved_from_explore course_code title category_id').lean() as any
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const isGuest = !payload.userId
    const isOwner = payload.userId ? quiz.created_by?.toString() === payload.userId : false

    if (!isOwner && !(quiz.is_public && quiz.status === 'published')) {
      return NextResponse.json({ error: 'This quiz has been closed by Admin or is not public.' }, { status: 403 })
    }

    const effective = await resolveEffectiveQuiz(quiz)
    if (!effective) return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 })

    const now = new Date()
    const questionOrder = difficulty === 'random' ? secureShuffle([...new Array(effective.questions.length).keys()]) : Array.from({ length: effective.questions.length }, (_, i) => i)
    const shouldShuffleOptions = shuffle_options ?? (difficulty === 'random')
    // Cache questions to avoid repeated Quiz DB fetches during answer processing
    const questionsCache = effective.questions.map((q: any) => {
      const processed = shouldShuffleOptions ? shuffleQuestionOptions(q) : q
      return {
        _id:
          processed._id && mongoose.Types.ObjectId.isValid(processed._id.toString())
            ? new mongoose.Types.ObjectId(processed._id.toString())
            : new mongoose.Types.ObjectId(),
        text: processed.text,
        options: processed.options,
        correct_answer: Array.isArray(processed.correct_answer)
          ? processed.correct_answer
          : typeof processed.correct_answer === 'number'
            ? [processed.correct_answer]
            : [],
        explanation: processed.explanation,
        ...(processed.image_url ? { image_url: processed.image_url } : {}),
      }
    })

    const buildInitialAndPreloadPayloads = async (createdSession: any) => {
      let categoryName = 'General'
      if (quiz.category_id) {
        const cat = await Category.findById(quiz.category_id).select('name').lean() as any
        if (cat?.name) categoryName = cat.name
      }

      const formattedQuestions = questionOrder.map((origIdx: number) => {
        const q = questionsCache[origIdx] ?? questionsCache[0] ?? {}
        const baseQuestion = {
          _id: q._id ? q._id.toString() : undefined,
          text: q.text,
          options: q.options,
          answer_selection_count: getAnswerSelectionCount(q),
          usage_count: 1,
          used_in_quizzes: [],
          ...(q.image_url ? { image_url: q.image_url } : {}),
        }
        if (createdSession.mode === 'flashcard') {
          return {
            ...baseQuestion,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
          }
        }
        return baseQuestion
      })

      const initialData = {
        session: {
          _id: createdSession._id.toString(),
          mode: createdSession.mode,
          status: createdSession.status,
          current_question_index: 0,
          user_answers: [],
          score: createdSession.score ?? 0,
          totalQuestions: effective.questions.length,
          courseCode: quiz.course_code || '',
          categoryName,
          title: quiz.title || '',
          started_at: createdSession.started_at ? createdSession.started_at.toISOString() : new Date().toISOString(),
          paused_at: null,
          total_paused_duration_ms: 0,
          is_temp: Boolean(createdSession.is_temp),
          quiz_id: createdSession.quiz_id.toString(),
          ...(createdSession.mode === 'flashcard' && createdSession.flashcard_stats ? { flashcard_stats: createdSession.flashcard_stats } : {}),
        },
        question: formattedQuestions[0] || null,
      }

      const preloadData = {
        sessionId: createdSession._id.toString(),
        mode: createdSession.mode,
        difficulty: createdSession.difficulty,
        status: createdSession.status,
        totalQuestions: effective.questions.length,
        questions: formattedQuestions,
      }

      return { initialData, preloadData }
    }

    // --- GUEST FLOW ---
    if (isGuest) {
      const guestId = payload.guestId ?? crypto.randomUUID()
      const session = await QuizSession.create({
        student_id: null,
        is_guest: true,
        guest_id: guestId,
        quiz_id: effective.id,
        mode,
        difficulty,
        status: 'active',
        current_question_index: 0,
        question_order: questionOrder,
        user_answers: [],
        score: 0,
        questions_cache: questionsCache,
        flashcard_stats: mode === 'flashcard' ? { total_cards: effective.questions.length, cards_known: 0, cards_unknown: 0, time_spent_ms: 0, current_round: 1 } : undefined,
        expires_at: new Date(now.getTime() + 86400000), // 24 hours TTL auto-cleanup
        started_at: now,
        last_activity_at: now,
        total_paused_duration_ms: 0
      })

      // Count 1 attempt immediately on creation and sync stats
      await Quiz.updateOne({ _id: effective.id }, { $inc: { studentCount: 1 } })
      syncUniqueStudentCount(effective.id)
        .catch(err => console.error('Failed to sync stats for guest session:', err))

      const { initialData, preloadData } = await buildInitialAndPreloadPayloads(session)

      const response = NextResponse.json({
        sessionId: session._id,
        mode: session.mode,
        difficulty: session.difficulty,
        totalQuestions: effective.questions.length,
        isGuest: true,
        initialData,
        preloadData,
      }, { status: 201 })
      response.cookies.set(GUEST_ID_COOKIE_NAME, guestId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
      })
      return response
    }

    // --- AUTHENTICATED STUDENT FLOW ---
    const studentId = new mongoose.Types.ObjectId(payload.userId)
    const modeGroup = ['flashcard'].includes(mode) ? 'learning' : 'assessment'
    const groupModes = modeGroup === 'learning' ? ['flashcard'] : ['immediate', 'review']

    if (mode === 'flashcard' && action !== 'restart' && action !== 'continue') {
      const completedFlashcard = await QuizSession.findOne({
        student_id: studentId,
        quiz_id: effective.id,
        mode: 'flashcard',
        status: 'completed',
        'flashcard_stats.cards_unknown': { $gt: 0 },
      }).sort({ completed_at: -1 }).lean() as any

      if (completedFlashcard) {
        const stats = completedFlashcard.flashcard_stats || {}
        return NextResponse.json(
          {
            error: `You still have ${stats.cards_unknown}/${stats.total_cards || effective.questions.length} unmemorized cards in this flashcard session.`,
            code: 'COMPLETED_FLASHCARD_HAS_UNKNOWN',
            activeSession: {
              sessionId: completedFlashcard._id.toString(),
              mode: 'flashcard',
              cardsKnown: stats.cards_known || 0,
              cardsUnknown: stats.cards_unknown || 0,
              totalCards: stats.total_cards || effective.questions.length,
              answeredCount: stats.cards_known || 0,
              totalQuestions: stats.total_cards || effective.questions.length,
            },
          },
          { status: 409 }
        )
      }
    }

    const activeSessions = await QuizSession.find({ student_id: studentId, quiz_id: effective.id, status: 'active', $or: [{ expires_at: { $gt: new Date() } }, { expires_at: { $exists: false } }] }).sort({ started_at: -1 }).lean() as any[]
    const groupSession = activeSessions.find(s => groupModes.includes(s.mode))

    if (groupSession) {
      const conflictRes = handleSessionConflicts(groupSession, effective.questions, action, modeGroup)
      if (conflictRes) return conflictRes
      await QuizSession.deleteOne({ _id: groupSession._id })
      if (action === 'restart') return NextResponse.json({}, { status: 200 })
    }

    await QuizSession.deleteMany({ student_id: studentId, quiz_id: effective.id, mode: { $in: groupModes }, status: { $ne: 'completed' } })

    const session = await QuizSession.create({
      student_id: studentId,
      is_guest: false,
      quiz_id: effective.id,
      mode,
      difficulty,
      status: 'active',
      current_question_index: 0,
      question_order: questionOrder,
      user_answers: [],
      score: 0,
      questions_cache: questionsCache,
      flashcard_stats: mode === 'flashcard' ? { total_cards: effective.questions.length, cards_known: 0, cards_unknown: 0, time_spent_ms: 0, current_round: 1 } : undefined,
      expires_at: mode === 'flashcard' ? undefined : new Date(now.getTime() + 86400000),
      started_at: now,
      last_activity_at: now,
      total_paused_duration_ms: 0
    })

    // Sync stats in background
    syncUniqueStudentCount(effective.id)
      .catch(err => console.error('Failed to sync stats:', err))

    const { initialData, preloadData } = await buildInitialAndPreloadPayloads(session)

    return NextResponse.json({
      sessionId: session._id,
      mode: session.mode,
      difficulty: session.difficulty,
      totalQuestions: effective.questions.length,
      initialData,
      preloadData,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/sessions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'], allowGuest: true })
