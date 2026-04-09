import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (payload.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
    }

    try {
      await connectDB()
    } catch {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const selectedSessionId = searchParams.get('sessionId')
    const idObjectId = new mongoose.Types.ObjectId(id)

    let session: any = null
    let quiz: any = null

    const quizLookup = (Quiz as any).findById?.(idObjectId)
    if (quizLookup) {
      quiz = quizLookup.lean ? await quizLookup.lean() : await quizLookup
    }

    // New mode: treat [id] as quiz id and return latest + attempts list.
    const quizSessions = await QuizSession.find({
      student_id: new mongoose.Types.ObjectId(payload.userId),
      quiz_id: idObjectId,
      status: 'completed',
    })
      .sort({ completed_at: -1 })
      .limit(10)
      .lean() as any[]

    if (quizSessions.length > 0) {
      if (selectedSessionId) {
        if (!mongoose.Types.ObjectId.isValid(selectedSessionId)) {
          return NextResponse.json({ error: 'Invalid selected session id' }, { status: 400 })
        }
        session = quizSessions.find((s) => s._id.toString() === selectedSessionId) ?? quizSessions[0]
      } else {
        session = quizSessions[0]
      }
    }

    if (!session && quiz) {
      const activeQuery = QuizSession.find({
        student_id: new mongoose.Types.ObjectId(payload.userId),
        quiz_id: idObjectId,
        status: 'active',
      })
        .sort({ started_at: -1 })
        .limit(1)

      const activeList = activeQuery.lean ? await activeQuery.lean() : await activeQuery
      const activeSession = Array.isArray(activeList) ? activeList[0] : null

      if (!activeSession) {
        // No completed and no active attempts under this quiz id; continue to legacy session-id flow.
      } else {
        return NextResponse.json({
          _id: null,
          quiz_id: idObjectId,
          quiz_title: quiz.title,
          source_type: quiz?.is_saved_from_explore
            ? 'saved_explore'
            : quiz?.created_by?.toString?.() === payload.userId
              ? 'self_created'
              : 'explore_public',
          source_label: quiz?.is_saved_from_explore
            ? 'Đã lưu từ Explore'
            : quiz?.created_by?.toString?.() === payload.userId
              ? 'Tự tạo'
              : 'Từ Explore/Public',
          mode: activeSession.mode ?? 'review',
          score: 0,
          total_questions: quiz.questions?.length ?? 0,
          completed_at: activeSession.started_at ?? new Date(),
          started_at: activeSession.started_at ?? new Date(),
          total_study_minutes: 0,
          attempts: [],
          active_session_id: activeSession._id ?? null,
          user_answers: [],
          questions: [],
        })
      }
    }

    // Backward compatibility: treat [id] as session id if no quiz sessions found by quiz id.
    if (!session) {
      session = await QuizSession.findById(id).lean() as any
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

      if (session.student_id.toString() !== payload.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (session.status !== 'completed') {
        return NextResponse.json({ error: 'Session is not completed' }, { status: 403 })
      }
    }

    quiz = await Quiz.findById(session.quiz_id).lean() as any
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const questions = (quiz.questions ?? []).map((q: any, idx: number) => {
      const submitted = (session.user_answers ?? []).find((a: any) => a.question_index === idx)
      const correctAnswerIndex = Array.isArray(q.correct_answer) ? q.correct_answer[0] : q.correct_answer

      return {
        _id: q._id,
        text: q.text,
        options: q.options,
        correct_answer: correctAnswerIndex,
        explanation: q.explanation ?? null,
        ...(q.image_url ? { image_url: q.image_url } : {}),
        submitted_answer: submitted?.answer_index ?? null,
        is_correct: submitted?.answer_index === correctAnswerIndex,
      }
    })

    const attempts = quizSessions.length > 0
      ? quizSessions.map((s) => ({
          session_id: s._id,
          score: s.score,
          mode: s.mode,
          completed_at: s.completed_at,
          started_at: s.started_at,
          total_paused_duration_ms: s.total_paused_duration_ms,
        }))
      : [
          {
            session_id: session._id,
            score: session.score,
            mode: session.mode,
            completed_at: session.completed_at,
            started_at: session.started_at,
            total_paused_duration_ms: session.total_paused_duration_ms,
          },
        ]

    const totalStudyMinutes = attempts.reduce((sum, a) => {
      const started = new Date(a.started_at).getTime()
      const completed = new Date(a.completed_at).getTime()
      const pausedDuration = a.total_paused_duration_ms || 0
      const actualDuration = Math.max(0, completed - started - pausedDuration)
      return sum + actualDuration
    }, 0)

    return NextResponse.json({
      _id: session._id,
      quiz_id: session.quiz_id,
      quiz_title: quiz.title,
      source_type: quiz?.is_saved_from_explore
        ? 'saved_explore'
        : quiz?.created_by?.toString?.() === payload.userId
          ? 'self_created'
          : 'explore_public',
      source_label: quiz?.is_saved_from_explore
        ? 'Đã lưu từ Explore'
        : quiz?.created_by?.toString?.() === payload.userId
          ? 'Tự tạo'
          : 'Từ Explore/Public',
      mode: session.mode,
      score: session.score,
      total_questions: quiz.questions?.length ?? 0,
      completed_at: session.completed_at,
      started_at: session.started_at,
      total_study_minutes: Math.round(totalStudyMinutes / 60000),
      attempts,
      user_answers: session.user_answers,
      questions,
    })
  } catch (err) {
    console.error('GET /api/history/[id] error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
