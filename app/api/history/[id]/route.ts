import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'

function calculateStudyMinutes(attempts: any[]): number {
  const totalMs = attempts.reduce((sum, a) => {
    const started = new Date(a.started_at).getTime()
    const completed = new Date(a.completed_at).getTime()
    const pausedDuration = a.total_paused_duration_ms || 0
    return sum + Math.max(0, completed - started - pausedDuration)
  }, 0)
  return Math.round(totalMs / 60000)
}

function formatQuestions(quizQuestions: any[], session: any) {
  return quizQuestions.map((q: any, idx: number) => {
    const submitted = (session.user_answers ?? []).find((a: any) => a.question_index === idx)
    const correctAnswerIndex = Array.isArray(q.correct_answer) ? q.correct_answer[0] : q.correct_answer
    const isCorrect = session.mode === 'flashcard' 
      ? (submitted?.is_correct ?? false)
      : (submitted?.answer_index === correctAnswerIndex)

    return {
      _id: q._id,
      text: q.text,
      options: q.options,
      correct_answer: correctAnswerIndex,
      explanation: q.explanation ?? null,
      ...(q.image_url ? { image_url: q.image_url } : {}),
      submitted_answer: submitted?.answer_index ?? null,
      is_correct: isCorrect,
    }
  })
}

function getSourceInfo(quiz: any, userId: string) {
  const isMix = Boolean(quiz.is_temp)
  if (isMix) return { type: 'mix_quiz', label: 'Quiz Trộn' }
  if (quiz.is_saved_from_explore) return { type: 'saved_explore', label: 'Đã lưu từ Explore' }
  if (quiz.created_by?.toString() === userId) return { type: 'self_created', label: 'Tự tạo' }
  return { type: 'explore_public', label: 'Từ Explore/Public' }
}

async function handleActivePath(quiz: any, activeSession: any, payload: any) {
  const isMix = Boolean(quiz.is_temp)
  const questionSource = (isMix && activeSession.questions_cache?.length) ? activeSession.questions_cache : (quiz.questions ?? [])
  const source = getSourceInfo(quiz, payload.userId)
  const answeredCount = new Set((activeSession.user_answers ?? []).map((a: any) => a.question_index).filter((idx: any) => Number.isInteger(idx) && idx >= 0)).size

  return NextResponse.json({
    _id: activeSession._id,
    quiz_id: quiz._id,
    quiz_title: quiz.title,
    source_type: source.type,
    source_label: source.label,
    is_mix: isMix,
    mode: activeSession.mode ?? 'immediate',
    score: activeSession.score ?? 0,
    total_questions: questionSource.length,
    completed_at: null,
    started_at: activeSession.started_at,
    total_study_minutes: 0,
    attempts: [],
    user_answers: activeSession.user_answers ?? [],
    questions: formatQuestions(questionSource, activeSession),
    status: 'active',
    has_active_session: true,
    active_session_id: activeSession._id,
    active_answered_count: answeredCount,
    active_total_count: questionSource.length,
    active_started_at: activeSession.started_at,
  })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyToken(req)
    if (!payload || payload.role !== 'student') return NextResponse.json({ error: payload ? 'Forbidden' : 'Unauthorized' }, { status: payload ? 403 : 401 })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const selectedSessionId = searchParams.get('sessionId')
    const idObjectId = new mongoose.Types.ObjectId(id)

    const quiz = await Quiz.findById(idObjectId).lean() as any
    const quizSessions = await QuizSession.find({ student_id: new mongoose.Types.ObjectId(payload.userId), quiz_id: idObjectId, status: 'completed' }).sort({ completed_at: -1 }).limit(10).lean() as any[]

    if (quizSessions.length > 0) {
      let session = quizSessions[0]
      if (selectedSessionId && mongoose.Types.ObjectId.isValid(selectedSessionId)) {
        session = quizSessions.find((s) => s._id.toString() === selectedSessionId) ?? quizSessions[0]
      }

      if (!quiz) {
        const attempts = quizSessions.map(s => ({ session_id: s._id, score: s.score, mode: s.mode, completed_at: s.completed_at, started_at: s.started_at, total_paused_duration_ms: s.total_paused_duration_ms }))
        return NextResponse.json({ _id: session._id, quiz_id: session.quiz_id, quiz_title: 'Quiz đã bị xóa', quiz_deleted: true, source_type: 'deleted', source_label: 'Quiz đã bị xóa', mode: session.mode, score: session.score, total_questions: session.user_answers?.length || 0, completed_at: session.completed_at, started_at: session.started_at, total_study_minutes: 0, attempts, user_answers: session.user_answers || [], questions: [], has_active_session: false, active_session_id: null, active_answered_count: 0, active_total_count: 0, active_started_at: null })
      }
    }

    // Try finding active session if no completed sessions or specific logic
    const activeList = await QuizSession.find({ student_id: new mongoose.Types.ObjectId(payload.userId), quiz_id: idObjectId, status: 'active' }).sort({ started_at: -1 }).limit(1).lean() as any[]
    const activeSession = activeList[0]

    if (quizSessions.length === 0 && quiz) {
      if (!activeSession) return NextResponse.json({ error: 'No sessions found for this quiz' }, { status: 404 })
      return handleActivePath(quiz, activeSession, payload)
    }

    // Treat [id] as session id (backward compatibility)
    let session: any = quizSessions.length > 0 ? quizSessions[0] : null
    if (!session) {
      session = await QuizSession.findById(id).lean() as any
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      if (session.student_id.toString() !== payload.userId || session.status !== 'completed') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentQuiz = quiz || await Quiz.findById(session.quiz_id).lean() as any
    if (!currentQuiz) {
      return NextResponse.json({ _id: session._id, quiz_id: session.quiz_id, quiz_title: 'Quiz đã bị xóa', quiz_deleted: true, source_type: 'deleted', source_label: 'Quiz đã bị xóa', mode: session.mode, score: session.score, total_questions: session.user_answers?.length || 0, completed_at: session.completed_at, started_at: session.started_at, total_study_minutes: 0, attempts: [{ session_id: session._id, score: session.score, mode: session.mode, completed_at: session.completed_at, started_at: session.started_at, total_paused_duration_ms: session.total_paused_duration_ms }], user_answers: session.user_answers || [], questions: [], has_active_session: false, active_session_id: null, active_answered_count: 0, active_total_count: 0, active_started_at: null })
    }

    const source = getSourceInfo(currentQuiz, payload.userId)
    const attempts = quizSessions.length > 0 ? quizSessions.map(s => ({ session_id: s._id, score: s.score, mode: s.mode, completed_at: s.completed_at, started_at: s.started_at, total_paused_duration_ms: s.total_paused_duration_ms })) : [{ session_id: session._id, score: session.score, mode: session.mode, completed_at: session.completed_at, started_at: session.started_at, total_paused_duration_ms: session.total_paused_duration_ms }]

    return NextResponse.json({
      _id: session._id,
      quiz_id: session.quiz_id,
      quiz_title: currentQuiz.title,
      source_type: source.type,
      source_label: source.label,
      is_mix: Boolean(currentQuiz.is_temp),
      mode: session.mode,
      score: session.score,
      total_questions: currentQuiz.questions?.length ?? 0,
      completed_at: session.completed_at,
      started_at: session.started_at,
      total_study_minutes: calculateStudyMinutes(attempts),
      ...(session.mode === 'flashcard' && session.flashcard_stats ? { flashcard_stats: session.flashcard_stats } : {}),
      attempts,
      user_answers: session.user_answers,
      questions: formatQuestions(currentQuiz.questions ?? [], session),
      has_active_session: Boolean(activeSession),
      active_session_id: activeSession?._id ?? null,
      active_answered_count: activeSession ? new Set((activeSession.user_answers ?? []).map((a: any) => a.question_index).filter((idx: any) => Number.isInteger(idx) && idx >= 0)).size : 0,
      active_total_count: currentQuiz.questions?.length ?? 0,
      active_started_at: activeSession?.started_at ?? null,
    })
  } catch (err) {
    console.error('GET /api/history/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
