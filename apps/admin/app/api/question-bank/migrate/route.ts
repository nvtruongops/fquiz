import { QuestionInputSchema, hasSameQuestionContent, normalizeQuestionUsageCodes, remapPublishedAnswer } from '@fquiz/models'
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
    const existingCodes = new Set(normalizeQuestionUsageCodes(existing.used_in_quizzes || []))
    const updatedQuizIds = [...(existing.used_in_quiz_ids || [])]

    for (const quiz of associatedQuizzes) {
      const qidStr = String(quiz._id)
      if (!existingQuizIds.includes(qidStr)) {
        existingQuizIds.push(qidStr)
        updatedQuizIds.push(quiz._id)
        normalizeQuestionUsageCodes([quiz.course_code]).forEach(code => existingCodes.add(code))
      }
    }

    const updateData: any = {
      used_in_quizzes: Array.from(existingCodes),
      used_in_quiz_ids: updatedQuizIds,
      usage_count: existingCodes.size,
    }

    if (!sameAnswer && resolve_conflicts === 'keep_most_used' && existingCodes.size > (existing.usage_count || 0)) {
      updateData.text = q.text
      updateData.correct_answer = q.correct_answer || []
      updateData.options = q.options
      updateData.explanation = q.explanation
      updateData.image_url = q.image_url
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

  const courseCodes = normalizeQuestionUsageCodes(associatedQuizzes.map(q => q.course_code))
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
          usage_count: courseCodes.length,
          used_in_quizzes: courseCodes,
          used_in_quiz_ids: quizIds,
          has_conflicts: false,
        },
      },
    },
    isNew: true,
  }
}

function hasConflictingSourceAnswer(question: z.infer<typeof QuestionInputSchema>, previous: z.infer<typeof QuestionInputSchema>) {
  const remapped = remapPublishedAnswer(question, previous.options)
  return !hasSameQuestionContent(question, previous) || !remapped ||
    JSON.stringify([...remapped].sort()) !== JSON.stringify([...previous.correct_answer].sort())
}

function preflightSourceQuestions(quizzes: any[]) {
  const sourceById = new Map<string, any>()
  const invalidQuestions: Array<{ quiz_id: string, question_index: number, issues: unknown }> = []
  for (const quiz of quizzes) {
    for (const [question_index, question] of (quiz.questions || []).entries()) {
      const parsedQuestion = QuestionInputSchema.safeParse(question)
      if (!parsedQuestion.success) invalidQuestions.push({ quiz_id: String(quiz._id), question_index, issues: parsedQuestion.error.issues })
      else {
        const id = getQuestionId(question)
        const previous = sourceById.get(id)
        if (previous && hasConflictingSourceAnswer(parsedQuestion.data, previous)) {
          invalidQuestions.push({ quiz_id: String(quiz._id), question_index, issues: `Conflicting source content or answer key for ${id}` })
        }
        sourceById.set(id, parsedQuestion.data)
        quiz.questions.splice(question_index, 1, { ...question, ...parsedQuestion.data })
      }
    }
  }
  return invalidQuestions
}

function validateFinalBankQuestion(result: ReturnType<typeof processMigrateEntry>, existing: any) {
  // Query updates bypass document validators: validate the actual merged stored snapshot.
  const finalQuestion = result.isExisting
    ? { ...existing, ...result.op!.updateOne!.update.$set }
    : result.op!.insertOne!.document
  return QuestionInputSchema.safeParse(finalQuestion)
}

async function handleMigrate(body: Record<string, unknown>, userId: string) {
  const parsed = MigrateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { category_id, resolve_conflicts } = parsed.data
  const categoryObjectId = new mongoose.Types.ObjectId(category_id)
  const quizzes = await loadQuizzes(categoryObjectId)
  const invalidQuestions = preflightSourceQuestions(quizzes)
  if (invalidQuestions.length) return NextResponse.json({ error: 'Invalid source questions; migration was not written', conflicts: invalidQuestions }, { status: 409 })
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
      continue
    }
    const validatedFinal = validateFinalBankQuestion(result, existing)
    if (!validatedFinal.success) {
      return NextResponse.json({ error: 'Invalid final bank question; migration was not written', question_id: qid, details: validatedFinal.error.issues }, { status: 409 })
    }
    if (result.isExisting) {
      bulkOps.push(result.op)
      existingQuestions++
    } else if (result.isNew) {
      bulkOps.push(result.op)
      newQuestions++
    }
  }

  if (bulkOps.length > 0) {
    try {
      await QuestionBank.bulkWrite(bulkOps)
    } catch (error: any) {
      return NextResponse.json({ error: 'Migration write failed; some items may have been written. Retry the same request after resolving the database error.', retry_required: true, partial_write_possible: true, planned_question_ids: Array.from(incomingMap.keys()), write_errors: error.writeErrors?.map((item: any) => ({ index: item.index, code: item.code })) }, { status: 500 })
    }
  }

  const conflictSuffix = skippedConflicts > 0 ? `, skipped ${skippedConflicts} conflicts` : ''
  const summary = `Added ${newQuestions} new questions, updated ${existingQuestions} existing questions${conflictSuffix}.`

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
