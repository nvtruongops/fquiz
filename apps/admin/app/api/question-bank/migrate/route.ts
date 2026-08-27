import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { QuestionBank } from '@/lib/models/QuestionBank'
import { generateQuestionId, areAnswersSame, getAnswerTexts } from '@/lib/utils/question-id'
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
    status: 'published',
    is_public: true,
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
      const answerTexts = getAnswerTexts(v.options, v.correct_answer).join('||')
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

function buildIncomingQuestionMap(quizzes: any[]) {
  const incomingMap = new Map<string, { q: any; quizzes: Array<{ _id: any; course_code: string }> }>()
  for (const quiz of quizzes) {
    if (!Array.isArray(quiz.questions)) continue
    for (const q of quiz.questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length === 0) continue
      const qid = getQuestionId(q)
      if (!incomingMap.has(qid)) {
        incomingMap.set(qid, { q, quizzes: [] })
      }
      const entry = incomingMap.get(qid)!
      if (!entry.quizzes.some(item => String(item._id) === String(quiz._id))) {
        entry.quizzes.push({ _id: quiz._id, course_code: quiz.course_code })
      }
    }
  }
  return incomingMap
}

function processMigrateEntry(
  qid: string,
  q: any,
  associatedQuizzes: Array<{ _id: any; course_code: string }>,
  existing: any,
  resolve_conflicts: string,
  categoryObjectId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId
) {
  if (existing) {
    const sameAnswer = areAnswersSame(
      { options: q.options as string[], correct_answer: (q.correct_answer ?? []) as number | number[] },
      { options: existing.options, correct_answer: existing.correct_answer }
    )

    if (!sameAnswer && resolve_conflicts === 'skip') {
      return { skipped: true }
    }

    const existingQuizIds = (existing.used_in_quiz_ids || []).map((id: any) => String(id))
    const existingCodes = new Set<string>(existing.used_in_quizzes || [])
    const updatedQuizIds = [...(existing.used_in_quiz_ids || [])]

    for (const quiz of associatedQuizzes) {
      const qidStr = String(quiz._id)
      if (!existingQuizIds.includes(qidStr)) {
        existingQuizIds.push(qidStr)
        updatedQuizIds.push(quiz._id)
        existingCodes.add(quiz.course_code)
      }
    }

    const updateData: any = {
      used_in_quizzes: Array.from(existingCodes),
      used_in_quiz_ids: updatedQuizIds,
      usage_count: updatedQuizIds.length,
    }

    if (!sameAnswer && resolve_conflicts === 'keep_most_used' && associatedQuizzes.length > (existing.usage_count || 0)) {
      updateData.correct_answer = q.correct_answer || []
      updateData.options = q.options
      if (q.explanation) updateData.explanation = q.explanation
    }

    return {
      op: {
        updateOne: {
          filter: { _id: existing._id },
          update: { $set: updateData },
        },
      },
      isExisting: true,
    }
  }

  const courseCodes = Array.from(new Set(associatedQuizzes.map(q => q.course_code)))
  const quizIds = associatedQuizzes.map(q => q._id)

  return {
    op: {
      insertOne: {
        document: {
          category_id: categoryObjectId,
          question_id: qid,
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer || [],
          explanation: q.explanation,
          image_url: q.image_url,
          created_by: createdBy,
          usage_count: quizIds.length,
          used_in_quizzes: courseCodes,
          used_in_quiz_ids: quizIds,
          has_conflicts: false,
        },
      },
    },
    isNew: true,
  }
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

  const existingBankDocs = await QuestionBank.find({ category_id: categoryObjectId }).lean()
  const bankMap = new Map<string, any>()
  for (const doc of existingBankDocs) {
    bankMap.set(doc.question_id, doc)
  }

  const incomingMap = buildIncomingQuestionMap(quizzes)

  let newQuestions = 0
  let existingQuestions = 0
  let skippedConflicts = 0
  const bulkOps: any[] = []

  for (const [qid, { q, quizzes: associatedQuizzes }] of incomingMap) {
    const existing = bankMap.get(qid)
    const result = processMigrateEntry(qid, q, associatedQuizzes, existing, resolve_conflicts, categoryObjectId, createdBy)

    if (result.skipped) {
      skippedConflicts++
    } else if (result.isExisting) {
      bulkOps.push(result.op)
      existingQuestions++
    } else if (result.isNew) {
      bulkOps.push(result.op)
      newQuestions++
    }
  }

  if (bulkOps.length > 0) {
    await QuestionBank.bulkWrite(bulkOps)
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

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const body = await req.json()
    const { mode } = body

    if (mode === 'scan') return handleScan(body)
    if (mode === 'migrate') return handleMigrate(body, payload.userId)

    return NextResponse.json({ error: 'Invalid mode. Use "scan" or "migrate".' }, { status: 400 })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})
