import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { authorizeResource } from '@/lib/modules/auth/authz'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'

/**
 * GET /api/sessions/[id]/questions
 * Returns all questions for a quiz session based on mode.
 * - Immediate mode: includes correct_answer and explanation
 * - Review mode: excludes correct_answer and explanation
 * Requirements: 6.1, 12.1, 12.3
 */
export async function GET(
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

    await connectDB()

    const session = await authorizeResource(payload, id, QuizSession, 'session', 'student_id')
    
    // Handle 'preparing' status
    if (session.status === 'preparing') {
      return NextResponse.json({ 
        error: 'Quiz is being prepared', 
        status: 'preparing' 
      }, { status: 202 })
    }

    if (session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
        { status: 410 }
      )
    }

    const quiz = await Quiz.findById(session.quiz_id).select('questions category_id').lean()
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const isCompleted = session.status === 'completed'
    const isImmediateMode = session.mode === 'immediate'
    const isFlashcardMode = session.mode === 'flashcard'

    // Get question order (use existing or create sequential)
    const questionOrder = session.question_order || Array.from({ length: quiz.questions.length }, (_, i) => i)

    // Đảm bảo mọi câu hỏi đều có question_id (tự sinh nếu thiếu)
    let hasMissingId = false
    for (const q of quiz.questions) {
      if (!q.question_id) {
        q.question_id = generateQuestionId(q)
        hasMissingId = true
      }
    }
    // Tự động repair DB nếu có câu thiếu question_id
    if (hasMissingId) {
      await Quiz.updateOne({ _id: session.quiz_id }, { $set: { questions: quiz.questions } })
    }

    // Batch lookup usage_count từ QuestionBank
    const questionIds = questionOrder.map((i: number) => quiz.questions[i]?.question_id).filter(Boolean)
    const usageMap = new Map<string, number>()
    if (questionIds.length > 0 && quiz.category_id) {
      const bankDocs = await QuestionBank.find({
        category_id: quiz.category_id,
        question_id: { $in: questionIds },
      }).select('question_id usage_count').lean()
      for (const doc of bankDocs) {
        usageMap.set(doc.question_id, doc.usage_count)
      }
    }

    // Set of display indexes that have already been answered by the student
    const answeredDisplayIndexes = new Set(
      (session.user_answers || []).map((ua: any) => ua.question_index)
    )

    // For immediate mode (only already answered) or completed/flashcard sessions: include correct_answer and explanation
    // Otherwise: exclude correct_answer and explanation
    const questions = questionOrder.map((originalIndex: number, displayIndex: number) => {
      const q = quiz.questions[originalIndex]
      const baseQuestion = {
        _id: q._id,
        text: q.text,
        options: q.options,
        answer_selection_count: Array.isArray(q.correct_answer)
          ? Math.min(Math.max(q.correct_answer.length, 1), q.options.length)
          : 1,
        ...(q.image_url ? { image_url: q.image_url } : {}),
      }

      const isQuestionAnswered = answeredDisplayIndexes.has(displayIndex)

      const questionWithUsage = {
        ...baseQuestion,
        usage_count: usageMap.get(q.question_id!) ?? 0,
      }

      // Include answers for immediate mode (only if already answered), completed sessions, or flashcard mode
      if (isCompleted || isFlashcardMode || (isImmediateMode && isQuestionAnswered)) {
        return {
          ...questionWithUsage,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        }
      }

      // Review mode (active) or unanswered immediate questions: exclude answers
      return questionWithUsage
    })

    return NextResponse.json(
      {
        sessionId: session._id,
        mode: session.mode,
        difficulty: session.difficulty,
        status: session.status,
        totalQuestions: questions.length,
        questions,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('GET /api/sessions/[id]/questions error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
