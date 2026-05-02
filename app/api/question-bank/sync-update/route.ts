import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { QuestionBank } from '@/models/QuestionBank'
import { Quiz } from '@/models/Quiz'
import { generateQuestionId } from '@/lib/question-id-generator'
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
    const parsed = SyncUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, old_question_id, new_question } = parsed.data

    await connectDB()

    // Generate new question ID
    const newQuestionId = generateQuestionId({
      text: new_question.text,
      options: new_question.options,
      correct_answer: new_question.correct_answer,
    })

    // Get old question from bank
    const oldQuestion = await QuestionBank.findOne({
      category_id,
      question_id: old_question_id,
    })

    if (!oldQuestion) {
      return NextResponse.json({
        error: 'Question not found in bank',
      }, { status: 404 })
    }

    const usedInQuizzes = oldQuestion.used_in_quizzes || []

    // Update all quizzes
    let updatedQuizCount = 0
    const errors: string[] = []

    for (const courseCode of usedInQuizzes) {
      try {
        const quiz = await Quiz.findOne({
          course_code: courseCode,
          category_id,
        })

        if (!quiz || !Array.isArray(quiz.questions)) continue

        let hasChanges = false

        // Update matching questions
        quiz.questions.forEach((q: any) => {
          if (!q.text || !Array.isArray(q.options)) return

          const qId = generateQuestionId({
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer || [],
          })

          if (qId === old_question_id) {
            // Update question
            q.text = new_question.text
            q.options = new_question.options
            q.correct_answer = new_question.correct_answer
            if (new_question.explanation) q.explanation = new_question.explanation
            if (new_question.image_url) q.image_url = new_question.image_url
            hasChanges = true
          }
        })

        if (hasChanges) {
          await quiz.save()
          updatedQuizCount++
        }
      } catch (error) {
        errors.push(`Failed to update quiz ${courseCode}`)
      }
    }

    // Update Question Bank
    // Always delete old and create new because question_id changes when content changes
    await QuestionBank.deleteOne({
      category_id,
      question_id: old_question_id,
    })

    await QuestionBank.create({
      category_id,
      question_id: newQuestionId,
      text: new_question.text,
      options: new_question.options,
      correct_answer: new_question.correct_answer,
      explanation: new_question.explanation,
      image_url: new_question.image_url,
      created_by: payload.userId,
      usage_count: usedInQuizzes.length,
      used_in_quizzes: usedInQuizzes,
      has_conflicts: false,
    })

    return NextResponse.json({
      success: true,
      updated_quizzes: updatedQuizCount,
      total_quizzes: usedInQuizzes.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Đã cập nhật ${updatedQuizCount}/${usedInQuizzes.length} quiz thành công`,
    })
  } catch (error: any) {
    console.error('Error syncing update:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
