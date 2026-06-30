import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import {
  COURSE_CODE_ALLOWED_MESSAGE,
  COURSE_CODE_MAX_LENGTH,
  COURSE_CODE_PATTERN,
} from '@/lib/modules/quiz/schemas/quiz'
import { z } from 'zod'

const AutoSyncSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z.string().trim().min(1).max(COURSE_CODE_MAX_LENGTH).regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
  quiz_id: z.string().optional(),
  questions: z.array(z.object({
    text: z.string(),
    options: z.array(z.string()),
    correct_answer: z.array(z.number()),
    explanation: z.string().optional(),
    image_url: z.string().optional(),
  })),
})

/**
 * POST /api/question-bank/auto-sync
 * Tự động sync Question Bank khi save quiz
 * - Xóa câu cũ không còn dùng
 * - Thêm/update câu mới
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = AutoSyncSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, course_code, quiz_id, questions } = parsed.data

    await connectDB()

    // Resolve quiz ObjectId
    const quizObjectId = quiz_id
      ? new mongoose.Types.ObjectId(quiz_id)
      : null

    // 1. Get all questions currently in this quiz from Question Bank
    const existingBankQuestions = await QuestionBank.find({
      category_id,
      used_in_quizzes: course_code,
    }).lean()

    // 2. Generate IDs for new questions
    const newQuestionIds = new Set(
      questions.map(q => generateQuestionId({
        text: q.text,
        options: q.options,
        correct_answer: q.correct_answer,
      }))
    )

    // 3. Find questions to remove (old questions no longer in quiz)
    const questionsToRemove = existingBankQuestions.filter(
      bq => !newQuestionIds.has(bq.question_id)
    )

    // 4. Remove this quiz from used_in_quizzes or delete if no other quiz uses it
    for (const oldQuestion of questionsToRemove) {
      const oldQuizIds = (oldQuestion.used_in_quiz_ids || []).map((id: any) => String(id))

      if (oldQuestion.used_in_quizzes.length <= 1 && oldQuizIds.length <= 1) {
        await QuestionBank.deleteOne({
          category_id,
          question_id: oldQuestion.question_id,
        })
      } else {
        const updateData: any = {
          used_in_quizzes: oldQuestion.used_in_quizzes.filter((code: string) => code !== course_code),
        }
        if (quizObjectId) {
          updateData.used_in_quiz_ids = oldQuizIds.filter((id: string) => id !== String(quizObjectId))
        }
        updateData.usage_count = quizObjectId
          ? updateData.used_in_quiz_ids.length
          : updateData.used_in_quizzes.length

        await QuestionBank.updateOne(
          { category_id, question_id: oldQuestion.question_id },
          { $set: updateData }
        )
      }
    }

    // 5. Add/update new questions
    for (const question of questions) {
      const questionId = generateQuestionId({
        text: question.text,
        options: question.options,
        correct_answer: question.correct_answer,
      })

      const existing = await QuestionBank.findOne({
        category_id,
        question_id: questionId,
      })

      if (existing) {
        const alreadyTrackedById = quizObjectId
          ? (existing.used_in_quiz_ids || []).some((id: any) => String(id) === String(quizObjectId))
          : existing.used_in_quizzes.includes(course_code)

        if (!alreadyTrackedById) {
          const updateData: any = {
            $addToSet: { used_in_quizzes: course_code },
          }
          if (quizObjectId) {
            updateData.$addToSet.used_in_quiz_ids = quizObjectId
          }

          await QuestionBank.updateOne(
            { category_id, question_id: questionId },
            updateData
          )
        }

        // Recalculate usage_count
        const updated = await QuestionBank.findOne({
          category_id,
          question_id: questionId,
        })
        if (updated) {
          const newCount = updated.used_in_quiz_ids && updated.used_in_quiz_ids.length > 0
            ? updated.used_in_quiz_ids.length
            : updated.used_in_quizzes.length
          if (updated.usage_count !== newCount) {
            await QuestionBank.updateOne(
              { category_id, question_id: questionId },
              { $set: { usage_count: newCount } }
            )
          }
        }
      } else {
        // New question - create with both trackers
        await QuestionBank.create({
          category_id,
          question_id: questionId,
          text: question.text,
          options: question.options,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          image_url: question.image_url,
          created_by: payload.userId,
          usage_count: 1,
          used_in_quizzes: [course_code],
          used_in_quiz_ids: quizObjectId ? [quizObjectId] : [],
          has_conflicts: false,
        })
      }
    }

    return NextResponse.json({
      success: true,
      removed: questionsToRemove.length,
      synced: questions.length,
    })
  } catch (error: any) {
    console.error('Error auto-syncing:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })