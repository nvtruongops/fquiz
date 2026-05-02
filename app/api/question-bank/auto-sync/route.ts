import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { QuestionBank } from '@/models/QuestionBank'
import { generateQuestionId } from '@/lib/question-id-generator'
import { z } from 'zod'

const AutoSyncSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z.string(),
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
export async function POST(req: Request) {
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

    const { category_id, course_code, questions } = parsed.data

    await connectDB()

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
      const otherQuizzes = oldQuestion.used_in_quizzes.filter((code: string) => code !== course_code)
      
      if (otherQuizzes.length === 0) {
        // No other quiz uses this - DELETE
        await QuestionBank.deleteOne({
          category_id,
          question_id: oldQuestion.question_id,
        })
      } else {
        // Other quizzes still use this - UPDATE
        await QuestionBank.updateOne(
          {
            category_id,
            question_id: oldQuestion.question_id,
          },
          {
            $set: {
              used_in_quizzes: otherQuizzes,
              usage_count: otherQuizzes.length,
            },
          }
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

      await QuestionBank.findOneAndUpdate(
        {
          category_id,
          question_id: questionId,
        },
        {
          $setOnInsert: {
            category_id,
            question_id: questionId,
            text: question.text,
            options: question.options,
            correct_answer: question.correct_answer,
            explanation: question.explanation,
            image_url: question.image_url,
            created_by: payload.userId,
            has_conflicts: false,
          },
          $addToSet: {
            used_in_quizzes: course_code,
          },
        },
        { upsert: true }
      )

      // Update usage_count
      const updated = await QuestionBank.findOne({
        category_id,
        question_id: questionId,
      })

      if (updated) {
        await QuestionBank.updateOne(
          {
            category_id,
            question_id: questionId,
          },
          {
            $set: {
              usage_count: updated.used_in_quizzes.length,
            },
          }
        )
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
}
