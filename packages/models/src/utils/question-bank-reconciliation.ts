import { QuestionInputSchema } from '../schemas/quiz'
import { generateCanonicalQuestionHash } from './ast-normalizer'
import { generateQuestionId } from './question-id-generator'

export function normalizeQuestionUsageCodes(values: Iterable<unknown>): string[] {
  const codes = new Set<string>()
  for (const value of values) {
    if (typeof value !== 'string') continue
    const code = value.trim().toUpperCase()
    if (code && !code.startsWith('MIX_') && !code.startsWith('TEMP_')) codes.add(code)
  }
  return [...codes].sort()
}

export function buildQuestionUsageCacheUpdate(question: {
  used_in_quizzes?: Iterable<unknown>
  usage_count?: unknown
}): { used_in_quizzes: string[]; usage_count: number } | null {
  const codes = normalizeQuestionUsageCodes(question.used_in_quizzes ?? [])
  const storedCodes = Array.isArray(question.used_in_quizzes) ? question.used_in_quizzes : []
  if (question.usage_count === codes.length && JSON.stringify(storedCodes) === JSON.stringify(codes)) return null
  return { used_in_quizzes: codes, usage_count: codes.length }
}

export function resolveQuestionBankUsageCodes(
  question: { used_in_quiz_ids?: Iterable<unknown>; used_in_quizzes?: Iterable<unknown> },
  courseCodeByQuizId: ReadonlyMap<string, unknown>,
): string[] {
  const quizIds = [...(question.used_in_quiz_ids ?? [])]
  const sourceCodes = quizIds.length > 0
    ? quizIds.map(id => courseCodeByQuizId.get(String(id)))
    : question.used_in_quizzes ?? []
  return normalizeQuestionUsageCodes(sourceCodes)
}

function addQuizQuestion(questions: Map<string, any>, quiz: any, question: any, code: string) {
  QuestionInputSchema.parse(question)
  if (!quiz.created_by) throw new Error('Question bank reconciliation requires a creator')
  const id = question.question_id || generateQuestionId(question)
  if (!id) return
  const association = JSON.stringify([String(quiz.category_id), id])
  const fingerprint = generateCanonicalQuestionHash(question)
  const existing = questions.get(association)
  if (existing && existing.fingerprint !== fingerprint) {
    throw new Error(`Question bank conflict for ${id} in category ${quiz.category_id}`)
  }
  const entry = existing ?? {
    questionId: id,
    fingerprint,
    categoryId: quiz.category_id,
    text: question.text,
    options: question.options,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    imageUrl: question.image_url,
    createdBy: quiz.created_by,
    courseCodes: new Set<string>(),
    quizIds: new Set<string>(),
  }
  if (!existing) questions.set(association, entry)
  entry.courseCodes.add(code)
  entry.quizIds.add(String(quiz._id))
}

function addQuizQuestions(questions: Map<string, any>, quiz: any) {
  const [code] = normalizeQuestionUsageCodes([quiz.course_code])
  if (!code) return
  for (const question of Array.isArray(quiz.questions) ? quiz.questions : []) {
    addQuizQuestion(questions, quiz, question, code)
  }
}

function buildBulkOperations(questions: Map<string, any>) {
  return Array.from(questions.values(), (data) => {
    const codes = normalizeQuestionUsageCodes(data.courseCodes)
    return {
      updateOne: {
        filter: { category_id: data.categoryId, question_id: data.questionId },
        update: {
          $set: {
            category_id: data.categoryId,
            text: data.text,
            options: data.options,
            correct_answer: data.correctAnswer,
            explanation: data.explanation,
            image_url: data.imageUrl,
            used_in_quizzes: codes,
            used_in_quiz_ids: Array.from(data.quizIds),
            usage_count: codes.length,
          },
          $setOnInsert: { created_by: data.createdBy },
        },
        upsert: true,
      },
    }
  })
}

export function buildQuestionBankOperations(publicQuizzes: any[]) {
  const questions = new Map<string, any>()
  for (const quiz of publicQuizzes) addQuizQuestions(questions, quiz)
  const bulkOps = buildBulkOperations(questions)
  return { bulkOps, syncedQuestionIds: [...new Set(Array.from(questions.values(), entry => entry.questionId))] }
}

async function loadPublicQuizSources(quizModel: any) {
  return quizModel.find({
    status: 'published',
    is_temp: { $ne: true },
    is_saved_from_explore: { $ne: true },
  }).select('_id course_code category_id questions question_refs created_by').lean()
}

async function hydrateReferencedQuestions(quizzes: any[], questionModel: any) {
  const referenceIds = quizzes.flatMap(quiz => quiz.questions?.length ? [] : quiz.question_refs ?? [])
  if (referenceIds.length === 0) return
  const references = await questionModel.find({ _id: { $in: referenceIds } })
    .select('question_id text options correct_answer explanation image_url').lean()
  const byId = new Map(references.map((question: any) => [String(question._id), question]))
  for (const quiz of quizzes) {
    if (quiz.questions?.length) continue
    quiz.questions = (quiz.question_refs ?? []).map((id: any) => {
      const question = byId.get(String(id))
      if (!question) throw new Error(`Cannot reconcile missing referenced question ${id}`)
      return question
    })
  }
}

async function resetStaleQuestionBankEntries(questionBankModel: any, bulkOps: any[]) {
  const filter = bulkOps.length ? { $nor: bulkOps.map((operation) => operation.updateOne.filter) } : {}
  await questionBankModel.updateMany(filter, { $set: { used_in_quizzes: [], used_in_quiz_ids: [], usage_count: 0 } })
}

/** Recompute cached quiz usage from authoritative quiz and reference documents. */
export async function rebuildQuestionBankUsageFromModels(
  quizModel: any,
  questionModel: any,
  questionBankModel: any,
): Promise<{ processedQuizzes: number; syncedQuestions: number }> {
  const quizzes = await loadPublicQuizSources(quizModel)
  await hydrateReferencedQuestions(quizzes, questionModel)
  const { bulkOps, syncedQuestionIds } = buildQuestionBankOperations(quizzes)
  if (bulkOps.length > 0) await questionBankModel.bulkWrite(bulkOps, { ordered: false })
  await resetStaleQuestionBankEntries(questionBankModel, bulkOps)
  return { processedQuizzes: quizzes.length, syncedQuestions: syncedQuestionIds.length }
}
