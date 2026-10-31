import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { countAnsweredQuestionIndexes, resolveEffectiveQuestionDeck } from '@/lib/modules/quiz/session-utils'
import { formatSessionResultQuestions, publicSessionAnswers, historicalResultEvidence, historicalResultQuestionOrder } from '@/lib/modules/quiz/session-result-mapping'

function calculateStudyMinutes(attempts: any[]): number {
  const totalMs = attempts.reduce((sum, a) => {
    const started = new Date(a.started_at).getTime()
    const completed = new Date(a.completed_at).getTime()
    const pausedDuration = a.total_paused_duration_ms || 0
    return sum + Math.max(0, completed - started - pausedDuration)
  }, 0)
  return Math.round(totalMs / 60000)
}

function getSourceInfo(quiz: any, userId: string) {
  const isMix = Boolean(quiz.is_temp)
  if (isMix) return { type: 'mix_quiz', label: 'Mix Quiz' }
  if (quiz.is_saved_from_explore) return { type: 'saved_explore', label: 'Saved from Explore' }
  if (quiz.created_by?.toString() === userId) return { type: 'self_created', label: 'Self-created' }
  return { type: 'explore_public', label: 'From Explore/Public' }
}

async function handleActivePath(quiz: any, activeSession: any, payload: any) {
  const isMix = Boolean(quiz.is_temp)
  const { questions: questionSource, questionOrder } = await resolveEffectiveQuestionDeck(activeSession, quiz)
  const source = getSourceInfo(quiz, payload.userId)
  const answeredCount = countAnsweredQuestionIndexes(activeSession.user_answers)

  return NextResponse.json({
    _id: activeSession._id,
    quiz_id: quiz._id,
    quiz_title: quiz.title,
    source_type: source.type,
    source_label: source.label,
    is_mix: isMix,
    mode: activeSession.mode ?? 'immediate',
    score: activeSession.mode === 'review' ? 0 : activeSession.score ?? 0,
    total_questions: questionOrder.length,
    completed_at: null,
    started_at: activeSession.started_at,
    total_study_minutes: 0,
    attempts: [],
    user_answers: publicSessionAnswers(activeSession),
    questions: formatSessionResultQuestions(activeSession, questionSource, questionOrder),
    status: 'active',
    has_active_session: true,
    active_session_id: activeSession._id,
    active_answered_count: answeredCount,
    active_total_count: questionOrder.length,
    active_started_at: activeSession.started_at,
  })
}

export const GET = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const selectedSessionId = searchParams.get('sessionId')
    const idObjectId = new mongoose.Types.ObjectId(id)
    const studentObjectId = new mongoose.Types.ObjectId(payload.userId)

    const [quiz, quizSessions, activeList] = await Promise.all([
      Quiz.findById(idObjectId).lean() as Promise<any>,
      QuizSession.find({ student_id: studentObjectId, quiz_id: idObjectId, status: 'completed' }).sort({ completed_at: -1 }).limit(25).lean() as Promise<any[]>,
      QuizSession.find({ student_id: studentObjectId, quiz_id: idObjectId, status: 'active' }).sort({ started_at: -1 }).limit(1).lean() as Promise<any[]>,
    ])

    const activeSession = activeList[0]

    if (quizSessions.length === 0 && quiz) {
      if (!activeSession) {
        return NextResponse.json({
          _id: null,
          quiz_id: quiz._id,
          quiz_title: quiz.title,
          attempts: [],
          has_active_session: false,
          active_session_id: null,
          active_answered_count: 0,
          active_total_count: 0,
          active_started_at: null,
        })
      }
      return handleActivePath(quiz, activeSession, payload)
    }

    // Treat [id] as session id (backward compatibility)
    let session: any = quizSessions.find(s => s._id.toString() === selectedSessionId) ?? quizSessions[0] ?? null
    if (!session) {
      session = await QuizSession.findById(id).lean() as any
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      if (session.student_id?.toString() !== payload.userId || session.status !== 'completed') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sourceQuiz = quiz || await Quiz.findById(session.quiz_id).lean() as any
    const currentQuiz = sourceQuiz ?? { _id: session.quiz_id, title: 'Deleted Quiz', questions: [], is_temp: session.is_temp }
    const { questions: effectiveQuestions, questionOrder: resolvedOrder } = await resolveEffectiveQuestionDeck(session, sourceQuiz)
    const evidence = historicalResultEvidence(session, sourceQuiz)
    const questionOrder = evidence.snapshot_unavailable
      ? historicalResultQuestionOrder(session, resolvedOrder)
      : resolvedOrder
    const source = getSourceInfo(currentQuiz, payload.userId)
    const resolveSingleSessionTotal = (s: any) => {
      if (Array.isArray(s.question_order) && s.question_order.length > 0) return s.question_order.length
      if (Array.isArray(s.questions_cache) && s.questions_cache.length > 0) return s.questions_cache.length
      if (s.flashcard_stats?.total_cards) return s.flashcard_stats.total_cards
      return currentQuiz?.questions?.length ?? 0
    }

    const resolveCorrectCount = (s: any) => {
      if (s.mode === 'flashcard' && s.flashcard_stats) {
        return s.flashcard_stats.cards_known ?? 0
      }
      if (Array.isArray(s.user_answers) && s.user_answers.length > 0) {
        return s.user_answers.filter((a: any) => a.is_correct).length
      }
      return s.score ?? 0
    }

    const attempts = quizSessions.length > 0
      ? quizSessions.map(s => ({
          session_id: s._id,
          score: s.score,
          correct_count: resolveCorrectCount(s),
          mode: s.mode,
          completed_at: s.completed_at,
          started_at: s.started_at,
          total_paused_duration_ms: s.total_paused_duration_ms,
          total_questions: resolveSingleSessionTotal(s),
        }))
      : [{
          session_id: session._id,
          score: session.score,
          correct_count: resolveCorrectCount(session),
          mode: session.mode,
          completed_at: session.completed_at,
          started_at: session.started_at,
          total_paused_duration_ms: session.total_paused_duration_ms,
          total_questions: resolveSingleSessionTotal(session),
        }]

    return NextResponse.json({
      _id: session._id,
      quiz_id: session.quiz_id,
      quiz_title: currentQuiz.title,
      source_type: source.type,
      source_label: source.label,
      is_mix: Boolean(currentQuiz.is_temp),
      mode: session.mode,
      score: session.score,
      total_questions: questionOrder.length,
      ...(sourceQuiz ? {} : { quiz_deleted: true }),
      ...evidence,
      completed_at: session.completed_at,
      started_at: session.started_at,
      total_study_minutes: calculateStudyMinutes(attempts),
      ...(session.mode === 'flashcard' && session.flashcard_stats ? { flashcard_stats: session.flashcard_stats } : {}),
      attempts,
      user_answers: session.user_answers,
      questions: formatSessionResultQuestions(session, evidence.snapshot_unavailable ? [] : effectiveQuestions, questionOrder),
      has_active_session: Boolean(activeSession),
      active_session_id: activeSession?._id ?? null,
      active_answered_count: countAnsweredQuestionIndexes(activeSession?.user_answers),
      active_total_count: activeSession ? resolveSingleSessionTotal(activeSession) : (currentQuiz.questions?.length ?? 0),
      active_started_at: activeSession?.started_at ?? null,
    })
  } catch (err) {
    console.error('GET /api/history/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })
