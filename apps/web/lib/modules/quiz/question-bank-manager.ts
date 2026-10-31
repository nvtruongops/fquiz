import { buildQuestionUsageCacheUpdate, normalizeQuestionUsageCodes, QuestionInputSchema, Question, rebuildQuestionBankUsageFromModels } from '@fquiz/models'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { generateQuestionId, areAnswersSame } from '@/lib/modules/quiz/question-id-generator'
import { normalizeTextAST, normalizeOptionAST } from '@/lib/modules/quiz/utils/ast-normalizer'
import { ensureArray } from '@/lib/core/utils/array-utils'
import type { Types } from 'mongoose'

function hasOptionOverlap(opts1: string[], opts2: string[]): boolean {
  if (!opts1 || !opts2 || opts1.length === 0 || opts2.length === 0) return false
  const set2 = new Set(opts2.map(o => normalizeOptionAST(o)).filter(Boolean))
  let matches = 0
  for (const o of opts1) {
    const norm = normalizeOptionAST(o)
    if (norm && set2.has(norm)) matches++
  }
  return matches >= 1 || (matches / Math.max(opts1.length, opts2.length)) >= 0.3
}

export interface QuestionInput {
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
}

export interface ExistingQuestionInfo {
  _id: string
  question_id?: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  used_in_quizzes: string[]
  used_in_quiz_ids: string[]
  usage_count: number
}

export interface ConflictInfo {
  hasConflict: boolean
  existingQuestion?: ExistingQuestionInfo
  conflictType?: 'same_answer' | 'different_answer'
  message?: string
}

function toExistingQuestionInfo(existing: any): ExistingQuestionInfo {
  const usedInQuizzes = normalizeQuestionUsageCodes(existing.used_in_quizzes || [])
  return {
    _id: String(existing._id),
    question_id: existing.question_id,
    text: existing.text,
    options: existing.options,
    correct_answer: existing.correct_answer,
    explanation: existing.explanation,
    used_in_quizzes: usedInQuizzes,
    used_in_quiz_ids: (existing.used_in_quiz_ids || []).map((id: any) => String(id)),
    usage_count: usedInQuizzes.length,
  }
}

function formatUsedInQuizzes(existing: {
  used_in_quizzes: string[]
  used_in_quiz_ids?: string[]
  usage_count: number
}): string {
  const codes = existing.used_in_quizzes || []
  if (codes.length === 0) {
    // Fallback to quiz_ids if codes are empty
    const ids = (existing.used_in_quiz_ids || []).map((id: any) => String(id).substring(0, 8))
    if (ids.length === 0) return 'Not used in any quiz yet'
    return `Used in ${ids.length} quizzes (${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''})`
  }
  const display = codes.slice(0, 3).join(', ')
  return codes.length > 3
    ? `${display}... (+${codes.length - 3} more)`
    : display
}

/**
 * Checks if a question exists in the course question bank
 * 
 * Layer 1: Find by question_id (hash of text + sorted options)
 * Layer 2: Compare answers by TEXT (not index) to avoid false conflicts
 */
export async function checkQuestionInBank(
  categoryId: Types.ObjectId | string,
  question: QuestionInput
): Promise<ConflictInfo> {
  const questionId = generateQuestionId(question)
  
  const existing = await QuestionBank.findOne({
    category_id: categoryId,
    question_id: questionId
  }).lean()
  
  if (!existing) {
    return { hasConflict: false }
  }

  const existingInfo = toExistingQuestionInfo(existing)
  
  // Layer 2: Compare answers by TEXT (not index)
  const sameAnswer = areAnswersSame(
    { options: question.options, correct_answer: question.correct_answer },
    { options: existing.options, correct_answer: existing.correct_answer }
  )
  
  if (sameAnswer) {
    return {
      hasConflict: true,
      existingQuestion: existingInfo,
      conflictType: 'same_answer',
      message: `This question already exists in this course with the same answer. ${formatUsedInQuizzes(existingInfo)}`
    }
  }
  
  return {
    hasConflict: true,
    existingQuestion: existingInfo,
    conflictType: 'different_answer',
    message: ` CONFLICT: A similar question already exists with a different answer!\n` +
             /* eslint-disable-next-line security/detect-object-injection */
             `Current answer: ${ensureArray(question.correct_answer).map((i: number) => question.options[i] || ('[' + i + ']')).join(', ')}\n` +
             /* eslint-disable-next-line security/detect-object-injection */
             `Bank answer: ${ensureArray(existing.correct_answer).map((i: number) => existing.options[i] || ('[' + i + ']')).join(', ')}\n` +
             `${formatUsedInQuizzes(existingInfo)}`
  }
}

/**
 * Checks multiple questions simultaneously (for quiz import)
 */
export async function checkQuestionsInBank(
  categoryId: Types.ObjectId | string,
  questions: QuestionInput[]
): Promise<Map<number, ConflictInfo>> {
  const conflicts = new Map<number, ConflictInfo>()

  // Fetch all existing questions in the bank for this category (single query)
  const existingQuestions = await QuestionBank.find({
    category_id: categoryId,
  }).lean()

  // Create 2 lookup maps: by question_id and by normalizeTextAST(text)
  const existingIdMap = new Map<string, any>()
  const existingTextMap = new Map<string, any>()

  for (const q of existingQuestions) {
    if (q.question_id) existingIdMap.set(q.question_id, q)
    if (q.text) existingTextMap.set(normalizeTextAST(q.text), q)
  }

  // Check each question
  questions.forEach((question, index) => {
    const questionId = generateQuestionId(question)
    const normalizedText = normalizeTextAST(question.text)

    let existing = existingIdMap.get(questionId)
    if (!existing && normalizedText) {
      const candidate = existingTextMap.get(normalizedText)
      if (candidate && hasOptionOverlap(question.options, candidate.options)) {
        existing = candidate
      }
    }

    if (!existing) {
      return // No conflict
    }

    // Layer 2: Compare answers by TEXT
    const sameAnswer = areAnswersSame(
      { options: question.options, correct_answer: question.correct_answer },
      { options: existing.options, correct_answer: existing.correct_answer }
    )

    const existingInfo = toExistingQuestionInfo(existing)

    conflicts.set(index, {
      hasConflict: true,
      existingQuestion: existingInfo,
      conflictType: sameAnswer ? 'same_answer' : 'different_answer',
      message: sameAnswer
        ? `Question ${index + 1}: Already exists (used ${existingInfo.usage_count} times)`
        : ` Question ${index + 1}: CONFLICT - Answer differs from question in question bank!`
    })
  })

  return conflicts
}

async function updateExistingQuestionUsage(
  existing: { _id: unknown },
  courseCode: string,
  quizId?: Types.ObjectId | string,
) {
  const [normalizedCourseCode] = normalizeQuestionUsageCodes([courseCode])
  if (normalizedCourseCode) {
    await QuestionBank.updateOne(
      { _id: existing._id },
      { $addToSet: {
        used_in_quizzes: normalizedCourseCode,
        ...(quizId ? { used_in_quiz_ids: quizId } : {}),
      } }
    )
  }

  const updated = await QuestionBank.findById(existing._id)
  if (!updated) return
  const cacheUpdate = buildQuestionUsageCacheUpdate(updated)
  if (!cacheUpdate) return
  updated.used_in_quizzes = cacheUpdate.used_in_quizzes
  updated.usage_count = cacheUpdate.usage_count
  await updated.save()
}

/**
 * Adds or updates a question in the bank
 */
export async function addOrUpdateQuestionInBank(
  categoryId: Types.ObjectId | string,
  question: QuestionInput,
  courseCode: string,
  userId: Types.ObjectId | string,
  quizId?: Types.ObjectId | string
): Promise<{ _id: string; isNew: boolean }> {
  question = QuestionInputSchema.parse(question)
  const questionId = generateQuestionId(question)

  const existing = await QuestionBank.findOne({
    category_id: categoryId,
    question_id: questionId
  })

  if (existing) {
    await updateExistingQuestionUsage(existing, courseCode, quizId)
    return { _id: String(existing._id), isNew: false }
  }

  const usageCodes = normalizeQuestionUsageCodes([courseCode])
  const newQuestion = await QuestionBank.create({
    category_id: categoryId,
    question_id: questionId,
    text: question.text,
    options: question.options,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    image_url: question.image_url,
    created_by: userId,
    usage_count: usageCodes.length,
    used_in_quizzes: usageCodes,
    used_in_quiz_ids: usageCodes.length > 0 && quizId ? [quizId] : [],
  })

  return { _id: String(newQuestion._id), isNew: true }
}

/**
 * Synchronizes all quiz questions into the question bank
 */
export async function syncQuizToQuestionBank(
  categoryId: Types.ObjectId | string,
  courseCode: string,
  questions: QuestionInput[],
  userId: Types.ObjectId | string,
  quizId?: Types.ObjectId | string
): Promise<{
  synced: number
  new: number
  existing: number
  conflicts: ConflictInfo[]
}> {
  questions = QuestionInputSchema.array().parse(questions)
  let newCount = 0
  let existingCount = 0
  const conflicts: ConflictInfo[] = []
  
  for (const question of questions) {
    const conflict = await checkQuestionInBank(categoryId, question)
    
    if (conflict.hasConflict && conflict.conflictType === 'different_answer') {
      conflicts.push(conflict)
      continue // Do not sync conflicting questions
    }
    
    const result = await addOrUpdateQuestionInBank(
      categoryId,
      question,
      courseCode,
      userId,
      quizId
    )
    
    if (result.isNew) {
      newCount++
    } else {
      existingCount++
    }
  }
  
  return {
    synced: newCount + existingCount,
    new: newCount,
    existing: existingCount,
    conflicts
  }
}

/**
 * Retrieves the most popular questions in a category
 */
export async function getPopularQuestions(
  categoryId: Types.ObjectId | string,
  limit: number = 10
) {
  return QuestionBank.find({ category_id: categoryId })
    .sort({ usage_count: -1 })
    .limit(limit)
    .lean()
}

/**
 * Rebuild / Reconcile QuestionBank cache directly from Quiz collection (Single Source of Truth)
 */
export async function rebuildQuestionBankUsage(): Promise<{ processedQuizzes: number; syncedQuestions: number }> {
  return rebuildQuestionBankUsageFromModels(Quiz, Question, QuestionBank)
}
