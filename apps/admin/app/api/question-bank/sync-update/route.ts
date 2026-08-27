import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { QuestionBank } from '@/lib/models/QuestionBank'
import { generateQuestionId } from '@/lib/utils/question-id'
import { z } from 'zod'

const SyncUpdateSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  old_question_id: z.string(),
  new_question: z.object({
    text: z.string(),
    options: z.array(z.string()),
    correct_answer: z.array(z.number()),
    explanation: z.string().optional(),
    image_url: z.string().optional(),
  }),
})

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const body = await req.json()
    const parsed = SyncUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, old_question_id, new_question } = parsed.data
    await connectDB()

    const effectiveOldId = old_question_id || generateQuestionId(new_question)
    const newQuestionId = generateQuestionId(new_question)

    const isObjectId = mongoose.Types.ObjectId.isValid(effectiveOldId)
    const oldQuestion = await QuestionBank.findOne({
      category_id,
      $or: [
        { question_id: effectiveOldId },
        ...(isObjectId ? [{ _id: effectiveOldId }] : []),
      ],
    })

    const categoryObjectId = new mongoose.Types.ObjectId(category_id)
    const quizzes = await Quiz.find({
      category_id: categoryObjectId,
      status: { $ne: 'deleted' },
      is_temp: { $ne: true },
    })

    let updatedQuizCount = 0
    function normalizeStr(s?: string) {
      return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
    }

    for (const quiz of quizzes) {
      if (!Array.isArray(quiz.questions)) continue
      let hasChanges = false

      quiz.questions.forEach((q: any) => {
        if (!q.text || !Array.isArray(q.options)) return

        const qId = q.question_id || generateQuestionId(q)
        const isMatch =
          qId === effectiveOldId ||
          (oldQuestion && qId === oldQuestion.question_id) ||
          normalizeStr(q.text) === normalizeStr(new_question.text)

        if (isMatch) {
          const selectedAnswerTexts = new_question.correct_answer
            .map((idx: number) => normalizeStr(new_question.options[idx]))
            .filter(Boolean)

          const newCorrectAnswer = q.options
            .map((opt: string, idx: number) => (selectedAnswerTexts.includes(normalizeStr(opt)) ? idx : -1))
            .filter((idx: number) => idx !== -1)

          if (newCorrectAnswer.length > 0) {
            q.correct_answer = newCorrectAnswer
          } else {
            q.options = new_question.options
            q.correct_answer = new_question.correct_answer
          }

          if (new_question.explanation) q.explanation = new_question.explanation
          if (new_question.image_url) q.image_url = new_question.image_url
          hasChanges = true
        }
      })

      if (hasChanges) {
        quiz.markModified('questions')
        await quiz.save()
        updatedQuizCount++
      }
    }

    if (oldQuestion) {
      await QuestionBank.updateOne(
        { _id: oldQuestion._id },
        {
          $set: {
            text: new_question.text,
            options: new_question.options,
            correct_answer: new_question.correct_answer,
            explanation: new_question.explanation || oldQuestion.explanation,
            image_url: new_question.image_url || oldQuestion.image_url,
            has_conflicts: false,
          },
        }
      )
    } else {
      await QuestionBank.create({
        category_id: categoryObjectId,
        question_id: newQuestionId,
        text: new_question.text,
        options: new_question.options,
        correct_answer: new_question.correct_answer,
        explanation: new_question.explanation || '',
        image_url: new_question.image_url || '',
        has_conflicts: false,
      })
    }

    return NextResponse.json({
      success: true,
      updated_quizzes: updatedQuizCount,
      message: `Đã cập nhật đồng bộ ${updatedQuizCount} đề thi trong ngân hàng thành công`,
    })
  } catch (error: any) {
    console.error('Error syncing update:', error)
    return NextResponse.json({ error: error.message || 'Lỗi đồng bộ ngân hàng' }, { status: 500 })
  }
}, { roles: ['admin'] })
