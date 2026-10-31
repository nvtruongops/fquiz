import { buildQuestionUsageCacheUpdate, normalizeQuestionUsageCodes, SyncQuizSchema } from '@fquiz/models'
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
const AutoSyncSchema = SyncQuizSchema

/**
 * POST /api/question-bank/auto-sync
 * Automatically sync Question Bank when saving quiz
 * - Delete old questions no longer in use
 * - Add/update new questions
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const body = await req.json()
    const parsed = AutoSyncSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, quiz_id, questions } = parsed.data
    const [course_code] = normalizeQuestionUsageCodes([parsed.data.course_code])
    if (!course_code) {
      return NextResponse.json({ error: 'A published quiz code is required for usage tracking' }, { status: 400 })
    }

    await connectDB()

    // Resolve quiz ObjectId
    const quizObjectId = quiz_id
      ? new mongoose.Types.ObjectId(quiz_id)
      : null

    // 1. Get all questions currently in this quiz from Question Bank
    const escapedCourseCode = course_code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const existingBankQuestions = await QuestionBank.find({
      category_id,
      used_in_quizzes: { $regex: `^${escapedCourseCode}$`, $options: 'i' },
    }).lean()

    // 2. Generate IDs for new questions
    const newQuestionIds = new Set(
      questions.map(q => generateQuestionId({
        text: q.text,
        options: q.options,
        correct_answer: q.correct_answer,
      }))
    )

    const questionsToRemove = existingBankQuestions.filter(
      bq => !newQuestionIds.has(bq.question_id)
    )

    await syncRemovedQuestions(category_id, course_code, quizObjectId, questionsToRemove)
    await syncUpsertQuestions(category_id, course_code, quizObjectId, payload.userId, questions)

    return NextResponse.json({
      success: true,
      removed: questionsToRemove.length,
      synced: questions.length,
    })
  } catch (error: any) {
    console.error('Error auto-syncing:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin'] })

async function syncRemovedQuestions(
  categoryId: string,
  courseCode: string,
  quizObjectId: mongoose.Types.ObjectId | null,
  questionsToRemove: any[]
) {
  const currentQuizId = quizObjectId ? String(quizObjectId) : ''
  const otherQuizIds = [...new Set(questionsToRemove.flatMap((question) =>
    (question.used_in_quiz_ids || []).map((id: any) => String(id)).filter((id: string) => id !== currentQuizId))) ]
  const linkedQuizzes = otherQuizIds.length > 0
    ? await Quiz.find({
        _id: { $in: otherQuizIds },
        status: 'published',
        is_temp: { $ne: true },
        is_saved_from_explore: { $ne: true },
      }).select('_id course_code').lean() as any[]
    : []
  const linkedCodesById = new Map(linkedQuizzes.map((quiz) => [String(quiz._id), quiz.course_code]))

  for (const oldQuestion of questionsToRemove) {
    const oldQuizIds = (oldQuestion.used_in_quiz_ids || []).map((id: any) => String(id))
    const remainingQuizIds = oldQuizIds.filter((id: string) => id !== currentQuizId && linkedCodesById.has(id))
    const cachedCodes = remainingQuizIds.length > 0
      ? remainingQuizIds.map((id: string) => linkedCodesById.get(id))
      : oldQuizIds.length === 0
        ? normalizeQuestionUsageCodes(oldQuestion.used_in_quizzes || []).filter(code => code !== courseCode)
        : []
    const usedInQuizzes = normalizeQuestionUsageCodes(cachedCodes)
    await QuestionBank.updateOne(
      { category_id: categoryId, question_id: oldQuestion.question_id },
      { $set: { used_in_quizzes: usedInQuizzes, used_in_quiz_ids: remainingQuizIds, usage_count: usedInQuizzes.length } },
    )
  }
}

async function syncUpsertQuestions(
  categoryId: string,
  courseCode: string,
  quizObjectId: mongoose.Types.ObjectId | null,
  userId: string,
  questions: any[]
) {
  for (const question of questions) {
    const questionId = generateQuestionId({
      text: question.text,
      options: question.options,
      correct_answer: question.correct_answer,
    })

    const existing = await QuestionBank.findOne({
      category_id: categoryId,
      question_id: questionId,
    })

    if (existing) {
      await updateExistingBankQuestion(categoryId, questionId, courseCode, quizObjectId, existing)
    } else {
      await QuestionBank.create({
        category_id: categoryId,
        question_id: questionId,
        text: question.text,
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        image_url: question.image_url,
        created_by: userId,
        usage_count: 1,
        used_in_quizzes: [normalizeQuestionUsageCodes([courseCode])[0]],
        used_in_quiz_ids: quizObjectId ? [quizObjectId] : [],
        has_conflicts: false,
      })
    }
  }
}

async function updateExistingBankQuestion(
  categoryId: string,
  questionId: string,
  courseCode: string,
  quizObjectId: mongoose.Types.ObjectId | null,
  existing: any
) {
  const [normalizedCourseCode] = normalizeQuestionUsageCodes([courseCode])
  if (!normalizedCourseCode) return
  const alreadyTrackedById = quizObjectId
    ? (existing.used_in_quiz_ids || []).some((id: any) => String(id) === String(quizObjectId))
    : normalizeQuestionUsageCodes(existing.used_in_quizzes || []).includes(normalizedCourseCode)

  if (!alreadyTrackedById) {
    const updateData: any = {
      $addToSet: { used_in_quizzes: normalizedCourseCode },
    }
    if (quizObjectId) {
      updateData.$addToSet.used_in_quiz_ids = quizObjectId
    }

    await QuestionBank.updateOne(
      { category_id: categoryId, question_id: questionId },
      updateData
    )
  }

  const updated = await QuestionBank.findOne({
    category_id: categoryId,
    question_id: questionId,
  })
  if (updated) {
    const cacheUpdate = buildQuestionUsageCacheUpdate(updated)
    if (cacheUpdate) {
      await QuestionBank.updateOne(
        { category_id: categoryId, question_id: questionId },
        { $set: cacheUpdate }
      )
    }
  }
}
