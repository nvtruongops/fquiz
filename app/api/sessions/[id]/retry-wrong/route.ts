import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { JWTPayload } from '@/lib/modules/auth/auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { secureShuffle } from '@/lib/core/utils/shuffle'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import type { UserAnswer } from '@/lib/modules/quiz/types/session'

/**
 * POST /api/sessions/[id]/retry-wrong
 * Creates a new quiz session containing only the questions answered incorrectly in a previous completed session.
 */
export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const validation = await validateQuizSessionRequest(id, payload, { checkExpired: false })
    if (!validation.isValid) return validation.response

    const parentSession = validation.session

    if (parentSession.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only retry wrong questions from a completed session' },
        { status: 400 }
      )
    }

    await connectDB()

    const quiz = parentSession.quiz_id
      ? await Quiz.findById(parentSession.quiz_id).select('questions').lean()
      : null

    const allQuestions = (parentSession.questions_cache?.length
      ? parentSession.questions_cache
      : (quiz?.questions ?? [])) as IQuestion[]

    if (!allQuestions || allQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions found for this quiz session' }, { status: 400 })
    }

    const userAnswers = (parentSession.user_answers ?? []) as UserAnswer[]
    const parentQuestionOrder = parentSession.question_order || Array.from({ length: allQuestions.length }, (_, i) => i)

    // Identify which questions were incorrect or unanswered
    const wrongQuestionIndices: number[] = []
    parentQuestionOrder.forEach((actualIdx: number, displayIdx: number) => {
      const ans = userAnswers.find((a) => a.question_index === displayIdx)
      if (!ans || !ans.is_correct) {
        wrongQuestionIndices.push(actualIdx)
      }
    })

    if (wrongQuestionIndices.length === 0) {
      return NextResponse.json(
        { error: 'Bạn đã làm đúng tất cả các câu hỏi trong lần thi này!' },
        { status: 400 }
      )
    }

    // Filter questions_cache for only wrong questions
    const wrongQuestionsCache = wrongQuestionIndices.map((actualIdx) => {
      const q = allQuestions[actualIdx]
      return {
        _id: q._id,
        text: q.text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        ...(q.image_url ? { image_url: q.image_url } : {}),
      }
    })

    const now = new Date()
    const difficulty = parentSession.difficulty || 'sequential'
    const questionOrder = difficulty === 'random'
      ? secureShuffle([...new Array(wrongQuestionsCache.length).keys()])
      : Array.from({ length: wrongQuestionsCache.length }, (_, i) => i)

    const newSession = await QuizSession.create({
      student_id: parentSession.student_id,
      quiz_id: parentSession.quiz_id,
      mode: parentSession.mode,
      difficulty,
      status: 'active',
      current_question_index: 0,
      question_order: questionOrder,
      user_answers: [],
      score: 0,
      questions_cache: wrongQuestionsCache,
      expires_at: new Date(now.getTime() + 86400000),
      started_at: now,
      last_activity_at: now,
      total_paused_duration_ms: 0,
      is_temp: parentSession.is_temp ?? false,
    })

    return NextResponse.json(
      {
        sessionId: newSession._id,
        mode: newSession.mode,
        difficulty: newSession.difficulty,
        totalQuestions: wrongQuestionsCache.length,
        resumed: false,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/sessions/[id]/retry-wrong error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })
