import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import type { QuestionBankDoc } from '@/lib/modules/quiz/models/QuestionBank'
import { generateQuestionId, areAnswersSame } from '@/lib/modules/quiz/question-id-generator'
import { z } from 'zod'

const ScanSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  mode: z.literal('scan'),
})

const MigrateSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  mode: z.literal('migrate'),
  resolve_conflicts: z.enum(['skip', 'keep_first', 'keep_most_used']).default('skip'),
})

const CleanupSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  mode: z.literal('cleanup'),
})

interface QuestionVariant {
  course_code: string
  correct_answer: number[]
  options: string[]
}

interface QuestionEntry {
  text: string
  variants: QuestionVariant[]
}

function getQuestionId(q: Record<string, unknown>): string {
  return (q.question_id as string) || generateQuestionId({ text: q.text as string, options: q.options as string[] })
}

async function loadQuizzes(categoryObjectId: mongoose.Types.ObjectId) {
  return Quiz.find({
    category_id: categoryObjectId,
    is_temp: { $ne: true },
    is_saved_from_explore: { $ne: true },
  }).lean()
}

function buildQuestionMap(quizzes: Record<string, any>[]): { questionMap: Map<string, QuestionEntry>; totalQuestions: number } {
  const questionMap = new Map<string, QuestionEntry>()
  let totalQuestions = 0

  for (const quiz of quizzes) {
    if (!Array.isArray(quiz.questions)) continue
    for (const q of quiz.questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length === 0) continue
      totalQuestions++
      const qid = getQuestionId(q)
      if (!questionMap.has(qid)) {
        questionMap.set(qid, { text: q.text, variants: [] })
      }
      const entry = questionMap.get(qid)!
      const exists = entry.variants.some(
        v => v.course_code === quiz.course_code &&
             areAnswersSame(
               { options: v.options, correct_answer: v.correct_answer },
               { options: q.options, correct_answer: q.correct_answer }
             )
      )
      if (!exists) {
        entry.variants.push({
          course_code: quiz.course_code,
          correct_answer: q.correct_answer || [],
          options: q.options,
        })
      }
    }
  }

  return { questionMap, totalQuestions }
}

function detectConflicts(questionMap: Map<string, QuestionEntry>) {
  const conflictDetails: Array<{
    question_id: string
    text: string
    variant_count: number
    variants: QuestionVariant[]
  }> = []
  let conflicts = 0

  for (const [qid, entry] of questionMap) {
    const answerGroups = new Map<string, QuestionVariant[]>()

    for (const v of entry.variants) {
      const answerTexts = v.correct_answer
        .map((i: number) => v.options[i]?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .join('||')
      if (!answerGroups.has(answerTexts)) {
        answerGroups.set(answerTexts, [])
      }
      answerGroups.get(answerTexts)!.push(v)
    }

    if (answerGroups.size > 1) {
      conflicts++
      conflictDetails.push({
        question_id: qid,
        text: entry.text,
        variant_count: entry.variants.length,
        variants: entry.variants,
      })
    }
  }

  return { conflicts, conflictDetails }
}

async function handleScan(body: Record<string, unknown>) {
  const parsed = ScanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { category_id } = parsed.data
  const categoryObjectId = new mongoose.Types.ObjectId(category_id)
  const quizzes = await loadQuizzes(categoryObjectId)
  const { questionMap, totalQuestions } = buildQuestionMap(quizzes)
  const { conflicts, conflictDetails } = detectConflicts(questionMap)

  return NextResponse.json({
    total_quizzes: quizzes.length,
    total_questions: totalQuestions,
    unique_questions: questionMap.size,
    conflicts,
    conflict_details: conflictDetails,
  })
}

async function processMigrateQuestion(
  q: Record<string, unknown>,
  quiz: Record<string, any>,
  categoryObjectId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId,
  resolveConflicts: string,
) {
  const qid = getQuestionId(q)
  const existing = await QuestionBank.findOne({
    category_id: categoryObjectId,
    question_id: qid,
  })

  if (existing) {
    const sameAnswer = areAnswersSame(
      { options: q.options as string[], correct_answer: (q.correct_answer ?? []) as number | number[] },
      { options: existing.options, correct_answer: existing.correct_answer }
    )

    if (!sameAnswer && resolveConflicts === 'skip') {
      return { outcome: 'skipped' as const }
    }

    const quizIdStr = String(quiz._id)
    const alreadyTrackedById = (existing.used_in_quiz_ids || []).some((id: any) => String(id) === quizIdStr)

    if (!alreadyTrackedById) {
      if (!existing.used_in_quizzes.includes(quiz.course_code)) {
        existing.used_in_quizzes.push(quiz.course_code)
      }
      existing.used_in_quiz_ids.push(quiz._id)
      existing.usage_count = existing.used_in_quiz_ids.length
    }

    if (!sameAnswer && resolveConflicts === 'keep_most_used') {
      const incomingVariants = await Quiz.countDocuments({
        $or: [
          { 'questions.question_id': qid },
          { 'questions.text': q.text },
        ],
      })
      if (incomingVariants > existing.usage_count) {
        existing.correct_answer = (q.correct_answer || []) as number[]
        existing.options = q.options as string[]
        existing.explanation = (q.explanation as string) || existing.explanation
      }
    }

    await existing.save()
    return { outcome: 'updated' as const }
  }

  await QuestionBank.create({
    category_id: categoryObjectId,
    question_id: qid,
    text: q.text as string,
    options: q.options as string[],
    correct_answer: (q.correct_answer || []) as number[],
    explanation: q.explanation as string | undefined,
    image_url: q.image_url as string | undefined,
    created_by: createdBy,
    usage_count: 1,
    used_in_quizzes: [quiz.course_code],
    used_in_quiz_ids: [quiz._id],
    has_conflicts: false,
  })

  return { outcome: 'created' as const }
}

async function handleMigrate(body: Record<string, unknown>, userId: string) {
  const parsed = MigrateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { category_id, resolve_conflicts } = parsed.data
  const categoryObjectId = new mongoose.Types.ObjectId(category_id)
  const quizzes = await loadQuizzes(categoryObjectId)
  const createdBy = new mongoose.Types.ObjectId(userId)

  let newQuestions = 0
  let existingQuestions = 0
  let skippedConflicts = 0

  for (const quiz of quizzes) {
    if (!Array.isArray(quiz.questions)) continue
    for (const q of quiz.questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length === 0) continue

      const { outcome } = await processMigrateQuestion(q, quiz, categoryObjectId, createdBy, resolve_conflicts)

      if (outcome === 'created') newQuestions++
      else if (outcome === 'updated') existingQuestions++
      else if (outcome === 'skipped') skippedConflicts++
    }
  }

  const conflictSuffix = skippedConflicts > 0 ? `, bỏ qua ${skippedConflicts} conflict` : ''
  const summary = `Đã thêm ${newQuestions} câu hỏi mới, cập nhật ${existingQuestions} câu đã có${conflictSuffix}.`

  return NextResponse.json({
    success: true,
    summary,
    new_questions: newQuestions,
    existing_questions: existingQuestions,
    skipped_conflicts: skippedConflicts,
  })
}

async function handleCleanup(body: Record<string, unknown>) {
  const parsed = CleanupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { category_id } = parsed.data
  const categoryObjectId = new mongoose.Types.ObjectId(category_id)

  const bankEntries = await QuestionBank.find({
    category_id: categoryObjectId,
    $or: [
      { used_in_quiz_ids: { $exists: false } },
      { used_in_quiz_ids: { $size: 0 } },
    ],
  })

  let updatedCount = 0
  for (const entry of bankEntries) {
    const quizIds: mongoose.Types.ObjectId[] = []
    for (const code of entry.used_in_quizzes) {
      const quiz = await Quiz.findOne({ course_code: code, category_id: categoryObjectId })
        .select('_id')
        .lean()
      if (quiz) {
        quizIds.push(quiz._id)
      }
    }
    if (quizIds.length > 0) {
      entry.used_in_quiz_ids = quizIds
      entry.usage_count = quizIds.length
      await entry.save()
      updatedCount++
    }
  }

  return NextResponse.json({
    success: true,
    message: `Đã cập nhật ${updatedCount} câu hỏi với quiz_ids`,
    updated: updatedCount,
  })
}

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const tokenPayload = await verifyToken(req)
    if (!tokenPayload || tokenPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { mode } = body

    if (mode === 'scan') return handleScan(body)
    if (mode === 'migrate') return handleMigrate(body, tokenPayload.userId)
    if (mode === 'cleanup') return handleCleanup(body)

    return NextResponse.json({ error: 'Invalid mode. Use "scan", "migrate", or "cleanup".' }, { status: 400 })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin'] })
