import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
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

/**
 * POST /api/question-bank/sync-update
 * Cập nhật câu hỏi trong Question Bank và TẤT CẢ quiz đang dùng
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
    const parsed = SyncUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, old_question_id, new_question } = parsed.data

    await connectDB()

    const effectiveOldId = old_question_id || generateQuestionId({
      text: new_question.text,
      options: new_question.options,
      correct_answer: new_question.correct_answer,
    })

    const newQuestionId = generateQuestionId({
      text: new_question.text,
      options: new_question.options,
      correct_answer: new_question.correct_answer,
    })

    const isObjectId = mongoose.Types.ObjectId.isValid(effectiveOldId)
    const oldQuestion = await QuestionBank.findOne({
      category_id,
      $or: [
        { question_id: effectiveOldId },
        ...(isObjectId ? [{ _id: effectiveOldId }] : []),
      ],
    })

    if (!oldQuestion) {
      return NextResponse.json({
        error: 'Question not found in bank',
      }, { status: 404 })
    }

    const usedInQuizzes = oldQuestion.used_in_quizzes || []
    const rawUsedInQuizIds = (oldQuestion.used_in_quiz_ids || []).map((id: any) => String(id))

    const filterOr: any[] = []
    if (rawUsedInQuizIds.length > 0) {
      filterOr.push({ _id: { $in: rawUsedInQuizIds } })
    }
    if (usedInQuizzes.length > 0) {
      filterOr.push({ course_code: { $in: usedInQuizzes } })
    }

    const affectedQuizzes = filterOr.length > 0
      ? await Quiz.find({ category_id, $or: filterOr })
      : []

    let updatedQuizCount = 0
    const errors: string[] = []
    const updatedQuizIds = new Set<string>()

    function normalizeStr(s?: string) {
      return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
    }

    for (const quiz of affectedQuizzes) {
      try {
        if (!Array.isArray(quiz.questions)) continue

        let hasChanges = false

        quiz.questions.forEach((q: any) => {
          if (!q.text || !Array.isArray(q.options)) return

          const qId = generateQuestionId({
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer || [],
          })

          const isMatch =
            qId === oldQuestion.question_id ||
            qId === effectiveOldId ||
            normalizeStr(q.text) === normalizeStr(oldQuestion.text)

          if (isMatch) {
            q.text = new_question.text

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
          await quiz.save()
          updatedQuizCount++
          updatedQuizIds.add(String(quiz._id))
        }
      } catch (error) {
        errors.push(`Failed to update quiz ${quiz.course_code || quiz._id}`)
      }
    }

    const finalQuizIds = Array.from(new Set([...rawUsedInQuizIds, ...updatedQuizIds]))

    // Update Question Bank
    if (effectiveOldId === newQuestionId || oldQuestion.question_id === newQuestionId) {
      await QuestionBank.updateOne(
        { _id: oldQuestion._id },
        {
          $set: {
            text: new_question.text,
            options: new_question.options,
            correct_answer: new_question.correct_answer,
            explanation: new_question.explanation || oldQuestion.explanation,
            image_url: new_question.image_url || oldQuestion.image_url,
            used_in_quiz_ids: finalQuizIds,
            has_conflicts: false,
          },
        }
      )
    } else {
      await QuestionBank.deleteOne({ _id: oldQuestion._id })

      await QuestionBank.create({
        category_id,
        question_id: newQuestionId,
        text: new_question.text,
        options: new_question.options,
        correct_answer: new_question.correct_answer,
        explanation: new_question.explanation,
        image_url: new_question.image_url,
        created_by: payload.userId,
        usage_count: finalQuizIds.length > 0 ? finalQuizIds.length : usedInQuizzes.length,
        used_in_quizzes: usedInQuizzes,
        used_in_quiz_ids: finalQuizIds,
        has_conflicts: false,
      })
    }

    return NextResponse.json({
      success: true,
      updated_quizzes: updatedQuizCount,
      total_quizzes: affectedQuizzes.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Đã cập nhật ${updatedQuizCount}/${affectedQuizzes.length} quiz thành công`,
    })
  } catch (error: any) {
    console.error('Error syncing update:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin'] })