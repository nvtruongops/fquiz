import { QuestionInputSchema } from '@fquiz/models'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import mongoose from 'mongoose'
import { refreshQuestionBankUsageCache } from '@/lib/question-bank/usage-cache'

function quizUpdateResponse(quiz: unknown, questionBankUsageRefreshed?: boolean) {
  return NextResponse.json({
    success: true,
    quiz,
    ...(questionBankUsageRefreshed !== undefined
      ? { question_bank_usage_refreshed: questionBankUsageRefreshed }
      : {}),
  })
}

function quizDeleteResponse(questionBankUsageRefreshed: boolean) {
  return NextResponse.json({
    success: true,
    message: 'Quiz deleted successfully',
    question_bank_usage_refreshed: questionBankUsageRefreshed,
  })
}

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
  }

  await connectDB()
  const quiz = await Quiz.findById(id).lean()
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  return NextResponse.json({ quiz })
})

export const PUT = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { status, title, is_public } = body

  const update: Record<string, any> = { updated_at: new Date() }
  if (status && ['draft', 'published', 'archived', 'deleted'].includes(status)) {
    update.status = status
  }
  if (title && typeof title === 'string' && title.trim()) {
    update.title = title.trim()
  }
  if (typeof is_public === 'boolean') {
    update.is_public = is_public
  }

  await connectDB()
  if (status === 'published') {
    const existing = await Quiz.findById(id).lean()
    if (!existing) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    const questions = QuestionInputSchema.array().min(1).safeParse(existing.questions)
    if (!questions.success) return NextResponse.json({ error: 'Cannot publish invalid questions', details: questions.error.issues }, { status: 400 })
  }
  const quiz = await Quiz.findByIdAndUpdate(id, update, { new: true }).lean()
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  const questionBankUsageRefreshed = status || typeof is_public === 'boolean'
    ? await refreshQuestionBankUsageCache()
    : undefined
  return quizUpdateResponse(quiz, questionBankUsageRefreshed)
})

export const DELETE = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
  }

  await connectDB()
  const deleted = await Quiz.findByIdAndDelete(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  const questionBankUsageRefreshed = await refreshQuestionBankUsageCache()
  return quizDeleteResponse(questionBankUsageRefreshed)
})
