import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { QuestionBank } from '@/lib/models/QuestionBank'
import { generateQuestionId, getAnswerTexts } from '@/lib/utils/question-id'
import { z } from 'zod'

const GetConflictsSchema = z.object({
  category_id: z.string().optional().nullable(),
})

const ResolveConflictSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  question_id: z.string(),
  question_text: z.string(),
  selected_variant: z.object({
    quiz_id: z.string(),
    course_code: z.string(),
    question_index: z.number().optional(),
    options: z.array(z.string()),
    correct_answer: z.array(z.number()),
    explanation: z.string().optional(),
    image_url: z.string().optional(),
  }),
  update_quizzes: z.boolean().default(false),
})

function normalizeStr(s?: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,;!?]+$/g, '')
}

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url)
    const rawCat = searchParams.get('category_id')
    const parsed = GetConflictsSchema.safeParse({ category_id: rawCat })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }

    const { category_id } = parsed.data
    await connectDB()

    const matchQuery: any = {
      status: 'published',
      is_public: true,
      is_saved_from_explore: { $ne: true },
    }

    if (category_id && category_id !== 'all' && mongoose.Types.ObjectId.isValid(category_id)) {
      matchQuery.category_id = new mongoose.Types.ObjectId(category_id)
    }

    const quizzes = await Quiz.find(matchQuery)
      .select('_id course_code questions')
      .lean()
    const questionGroups = new Map<string, {
      question_id: string
      text: string
      total_variants: number
      variants: Array<{
        quiz_id: unknown
        course_code: string
        question_index: number
        options: string[]
        correct_answer: number[]
        explanation?: string
        image_url?: string
      }>
    }>()

    for (const quiz of quizzes as any[]) {
      if (!Array.isArray(quiz.questions)) continue

      quiz.questions.forEach((question: any, question_index: number) => {
        if (!question?.text || !Array.isArray(question.options) || question.options.length === 0) return

        const questionId = question.question_id || generateQuestionId(question)
        if (!questionGroups.has(questionId)) {
          questionGroups.set(questionId, {
            question_id: questionId,
            text: question.text,
            total_variants: 0,
            variants: [],
          })
        }

        const group = questionGroups.get(questionId)!
        group.total_variants++
        group.variants.push({
          quiz_id: quiz._id,
          course_code: quiz.course_code || '',
          question_index,
          options: question.options,
          correct_answer: question.correct_answer || [],
          explanation: question.explanation,
          image_url: question.image_url,
        })
      })
    }

    const conflicts = [...questionGroups.values()]
      .filter(group => group.total_variants > 1)
      .map(group => {
        const answerGroups = new Map<string, any>()

        group.variants.forEach((v: any) => {
          const answerKey = JSON.stringify(getAnswerTexts(v.options, v.correct_answer))
          if (!answerGroups.has(answerKey)) {
            answerGroups.set(answerKey, {
              correct_answer: v.correct_answer,
              answer_texts: JSON.parse(answerKey),
              count: 0,
              quizzes: [],
              sample_variant: v
            })
          }
          const g = answerGroups.get(answerKey)
          g.count++
          g.quizzes.push(v.course_code)
        })

        if (answerGroups.size > 1) {
          return {
            question_id: group.question_id,
            text: group.text,
            total_variants: group.total_variants,
            answer_groups: Array.from(answerGroups.values())
          }
        }
        return null
      })
      .filter(Boolean)

    conflicts.sort((a: any, b: any) => b.total_variants - a.total_variants)

    return NextResponse.json({
      total_conflicts: conflicts.length,
      conflicts,
    })
  } catch (error: any) {
    console.error('Error fetching conflicts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const body = await req.json()
    const parsed = ResolveConflictSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }

    const { category_id, question_id, question_text, selected_variant, update_quizzes } = parsed.data
    await connectDB()

    await QuestionBank.findOneAndUpdate(
      { category_id, question_id },
      {
        $set: {
          category_id,
          question_id,
          text: question_text,
          options: selected_variant.options,
          correct_answer: selected_variant.correct_answer,
          explanation: selected_variant.explanation,
          image_url: selected_variant.image_url,
          usage_count: 1,
          used_in_quizzes: [selected_variant.course_code],
          has_conflicts: false,
          conflict_notes: `Resolved by admin at ${new Date().toISOString()}`,
          created_by: payload.userId,
        },
      },
      { upsert: true }
    )

    let updatedQuizzes = 0
    if (update_quizzes) {
      const quizzes = await Quiz.find({
        category_id,
        status: 'published',
        is_public: true,
      })

      const normalizedText = normalizeStr(question_text)

      for (const quiz of quizzes) {
        if (!Array.isArray(quiz.questions)) continue
        let hasChanges = false

        quiz.questions.forEach((q: any) => {
          if (!q.text || !Array.isArray(q.options)) return

          const qText = normalizeStr(q.text)
          if (qText !== normalizedText) return

          const selectedAnswerTexts = selected_variant.correct_answer
            .map((idx: number) => normalizeStr(selected_variant.options[idx]))
            .filter(Boolean)

          const newCorrectAnswer = q.options
            .map((opt: string, idx: number) => {
              const optNorm = normalizeStr(opt)
              return selectedAnswerTexts.includes(optNorm) ? idx : -1
            })
            .filter((idx: number) => idx !== -1)

          if (newCorrectAnswer.length > 0) {
            q.correct_answer = newCorrectAnswer
            if (selected_variant.explanation) {
              q.explanation = selected_variant.explanation
            }
            hasChanges = true
          } else {
            q.options = selected_variant.options
            q.correct_answer = selected_variant.correct_answer
            if (selected_variant.explanation) {
              q.explanation = selected_variant.explanation
            }
            hasChanges = true
          }
        })

        if (hasChanges) {
          await quiz.save()
          updatedQuizzes++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: update_quizzes
        ? `Conflict resolved and ${updatedQuizzes} quizzes updated`
        : 'Conflict resolved and saved to Question Bank',
      updated_quizzes: updatedQuizzes,
    })
  } catch (error: any) {
    console.error('Error resolving conflict:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})
