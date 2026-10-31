import { QuestionBankVariantSchema, QuestionInputSchema, planQuestionSynchronization, prepareQuestionSynchronization, saveSynchronizedQuizzes, resolveQuestionBankRevision } from '@fquiz/models'
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
  selected_variant: QuestionBankVariantSchema.omit({ text: true }).extend({
    quiz_id: z.string(),
    course_code: z.string(),
    question_index: z.number().int().min(0).optional(),
  }),
  update_quizzes: z.boolean().default(false),
})

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

type ConflictResolutionPlan = {
  categoryId: string
  questionId: string
  source: any
  selectedVariant: any
  updateQuizzes: boolean
  bank: any
  revision: any
  quizzes: any[]
  plans: any[]
  courseCodes: string[]
}

function validateConflictSource(selectedVariant: any, questionText: string, userId?: string) {
  const source = QuestionInputSchema.safeParse({ ...selectedVariant, text: questionText })
  if (!source.success) {
    return { success: false as const, error: NextResponse.json({ error: 'Validation failed', details: source.error.issues }, { status: 400 }) }
  }
  if (!mongoose.Types.ObjectId.isValid(userId || '')) {
    return { success: false as const, error: NextResponse.json({ error: 'A valid creator is required before synchronization' }, { status: 400 }) }
  }
  return { success: true as const, source: source.data }
}

async function prepareConflictResolution(data: any, userId?: string): Promise<{ plan?: ConflictResolutionPlan; error?: Response }> {
  const { category_id, question_id, question_text, selected_variant, update_quizzes } = data
  const validated = validateConflictSource(selected_variant, question_text, userId)
  if (!validated.success) return { error: validated.error }

  await connectDB()
  const { previous: bank, identity: revision, conflict } = await resolveQuestionBankRevision(
    QuestionBank, category_id, question_id, validated.source,
  )
  if (conflict) return { error: NextResponse.json({ error: 'Question identity conflict; no changes were written' }, { status: 409 }) }

  const quizzes = update_quizzes ? await Quiz.find({ category_id, status: 'published', is_public: true }) : []
  const synchronization = planQuestionSynchronization(quizzes, validated.source, [question_id])
  if (synchronization.conflictQuizId) {
    return { error: NextResponse.json({ error: 'Question options conflict; no changes were written', quiz_id: synchronization.conflictQuizId }, { status: 409 }) }
  }
  await prepareQuestionSynchronization(synchronization.plans, validated.source)

  const courseCodes = [...new Set([
    ...(bank?.used_in_quizzes ?? []),
    ...quizzes.map((quiz: any) => quiz.course_code),
    selected_variant.course_code,
  ].filter(Boolean))]
  return {
    plan: {
      categoryId: category_id,
      questionId: question_id,
      source: validated.source,
      selectedVariant: selected_variant,
      updateQuizzes: update_quizzes,
      bank,
      revision,
      quizzes,
      plans: synchronization.plans,
      courseCodes,
    },
  }
}

function buildConflictBankUpdate(plan: ConflictResolutionPlan, userId: string, updatedQuizIds: string[]) {
  return {
    category_id: plan.categoryId,
    ...plan.revision,
    text: plan.source.text,
    options: plan.source.options,
    correct_answer: plan.source.correct_answer,
    explanation: plan.selectedVariant.explanation,
    image_url: plan.selectedVariant.image_url,
    usage_count: plan.courseCodes.length,
    used_in_quizzes: plan.courseCodes,
    used_in_quiz_ids: [...new Set([...(plan.bank?.used_in_quiz_ids ?? []).map(String), ...updatedQuizIds])],
    has_conflicts: false,
    conflict_notes: `Resolved by admin at ${new Date().toISOString()}`,
    created_by: plan.bank?.created_by || userId,
  }
}

async function saveConflictResolution(plan: ConflictResolutionPlan, userId: string) {
  let updatedQuizzes = 0
  const updatedQuizIds: string[] = []
  try {
    await saveSynchronizedQuizzes(plan.plans, id => { updatedQuizzes++; updatedQuizIds.push(id) })
    await QuestionBank.findOneAndUpdate(
      plan.bank ? { _id: plan.bank._id } : { category_id: plan.categoryId, question_id: plan.revision.question_id },
      { $set: buildConflictBankUpdate(plan, userId, updatedQuizIds) },
      { upsert: true },
    )
  } catch {
    return NextResponse.json({ error: 'Synchronization failed; retry the same request to finish', updated_quiz_ids: updatedQuizIds, bank_write_confirmed: false, retry_required: true }, { status: 500 })
  }

  const message = plan.updateQuizzes
    ? `Conflict resolved and ${updatedQuizzes} quizzes updated`
    : 'Conflict resolved and saved to Question Bank'
  return NextResponse.json({ success: true, message, updated_quizzes: updatedQuizzes })
}

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const parsed = ResolveConflictSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }
    const prepared = await prepareConflictResolution(parsed.data, payload.userId)
    if (prepared.error) return prepared.error
    return saveConflictResolution(prepared.plan!, payload.userId)
  } catch (error: any) {
    console.error('Error resolving conflict:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})
