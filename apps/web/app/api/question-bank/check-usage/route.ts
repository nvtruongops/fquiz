import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import { resolveQuestionBankQuestions } from '@fquiz/models'
import { z } from 'zod'

const CheckUsageSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  question: z.object({
    text: z.string(),
    options: z.array(z.string()),
    correct_answer: z.array(z.number()),
  }),
})

/**
 * POST /api/question-bank/check-usage
 * Check if question exists in Question Bank and where it is currently used
 */
export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json()
    const parsed = CheckUsageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, question } = parsed.data

    await connectDB()

    // Generate question ID
    const questionId = generateQuestionId({
      text: question.text,
      options: question.options,
      correct_answer: question.correct_answer,
    })

    // Check if exists in Question Bank
    const existingQuestion = await QuestionBank.findOne({
      category_id,
      question_id: questionId,
    }).lean()

    if (!existingQuestion) {
      return NextResponse.json({
        exists: false,
        question_id: questionId,
      })
    }

    const [questionWithUsage] = await resolveQuestionBankQuestions([existingQuestion], Quiz)
    return NextResponse.json({
      exists: true,
      question_id: questionId,
      usage_count: questionWithUsage.usage_count,
      used_in_quizzes: questionWithUsage.used_in_quizzes,
      bank_answer: existingQuestion.correct_answer,
    })
  } catch (error: any) {
    console.error('Error checking question usage:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin'] })
