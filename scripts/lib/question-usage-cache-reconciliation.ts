import { getPublishedAnswerError } from '../../packages/models/src/utils/published-answer'
import { getQuestionIdentity } from '../../packages/models/src/utils/question-identity'
import { normalizeOptionAST } from '../../packages/models/src/utils/ast-normalizer'
import { normalizeQuestionUsageCodes } from '../../packages/models/src/utils/question-bank-reconciliation'

type Row = Record<string, any>
type Usage = { courseCodes: Set<string>; quizIds: Map<string, unknown> }
export interface UsageCacheChange {
  id: unknown
  filter: Row
  set: Row
  before: Array<{ path: string; exists: boolean; value?: unknown }>
}

function validContent(question: Row) {
  return typeof question.text === 'string' && question.text.trim().length > 0 &&
    Array.isArray(question.options) && question.options.length >= 2 &&
    question.options.every((option: unknown) => typeof option === 'string' && option.trim().length > 0)
}

function association(categoryId: unknown, questionId: string) {
  return JSON.stringify([String(categoryId), questionId])
}

function answerSignature(question: Row) {
  const answer = Array.isArray(question.correct_answer)
    ? question.correct_answer
    : Number.isSafeInteger(question.correct_answer) ? [question.correct_answer] : []
  return JSON.stringify(answer
    .map((index: number) => normalizeOptionAST(question.options[index] ?? ''))
    .sort((left: string, right: string) => left.localeCompare(right)))
}

function sameArray(left: unknown, right: unknown) {
  return Array.isArray(left) && JSON.stringify(left) === JSON.stringify(right)
}

function currentValueFilter(row: Row, field: string) {
  return Object.prototype.hasOwnProperty.call(row, field) ? row[field] : { $exists: false }
}

/** Plans cache-only usage writes. It never changes question content or answer keys. */
export function buildQuestionUsageCachePlan(
  collections: Record<string, Row[]>,
  blockedIds: Iterable<string> = [],
) {
  const conflicts: Array<{ reason: string; id?: string; categoryId?: string }> = []
  const blocked = new Set(blockedIds)
  const invalidCategories = new Set<string>()
  const answerVariants = new Map<string, Set<string>>()
  const usage = new Map<string, Usage>()
  const standalone = new Map((collections.questions ?? []).map(question => [String(question._id), question]))

  function recordAnswerEvidence(question: Row) {
    if (!validContent(question)) return
    const id = getQuestionIdentity(question as any).question_id
    if (getPublishedAnswerError(question as any)) {
      blocked.add(id)
      conflicts.push({ reason: 'invalid-answer-evidence', id })
      return
    }
    const variants = answerVariants.get(id) ?? new Set<string>()
    variants.add(answerSignature(question))
    answerVariants.set(id, variants)
  }

  const eligibleQuizzes = (collections.quizzes ?? []).filter(quiz =>
    quiz.status === 'published' && !quiz.is_temp && !quiz.is_saved_from_explore,
  )
  for (const quiz of eligibleQuizzes) {
    const categoryId = String(quiz.category_id ?? '')
    const code = normalizeQuestionUsageCodes([quiz.course_code])[0]
    if (!categoryId || !code) continue
    const references = (quiz.question_refs ?? []).map((id: unknown) => standalone.get(String(id)))
    if (references.some((question: Row | undefined) => !question)) {
      invalidCategories.add(categoryId)
      conflicts.push({ reason: 'dangling-question-reference', id: String(quiz._id), categoryId })
    }
    const questions = [...(quiz.questions ?? []), ...references.filter(Boolean)]
    for (const question of questions) {
      if (!validContent(question)) continue
      recordAnswerEvidence(question)
      const id = getQuestionIdentity(question as any).question_id
      const key = association(categoryId, id)
      const entry = usage.get(key) ?? { courseCodes: new Set<string>(), quizIds: new Map<string, unknown>() }
      entry.courseCodes.add(code)
      entry.quizIds.set(String(quiz._id), quiz._id)
      usage.set(key, entry)
    }
  }

  const bankRows = collections.questionbanks ?? []
  const bankGroups = new Map<string, Row[]>()
  for (const bank of bankRows) {
    if (!validContent(bank)) continue
    recordAnswerEvidence(bank)
    const id = getQuestionIdentity(bank as any).question_id
    const key = association(bank.category_id, id)
    const group = bankGroups.get(key) ?? []
    group.push(bank)
    bankGroups.set(key, group)
  }
  for (const [id, variants] of answerVariants) {
    if (variants.size > 1) {
      blocked.add(id)
      conflicts.push({ reason: 'answer-key-variants', id })
    }
  }
  for (const [key, rows] of bankGroups) {
    if (rows.length > 1) {
      const [categoryId, questionId] = JSON.parse(key)
      blocked.add(questionId)
      conflicts.push({ reason: 'duplicate-canonical-association', id: questionId, categoryId })
    }
  }

  const changes: UsageCacheChange[] = []
  for (const [key, rows] of bankGroups) {
    if (rows.length !== 1) continue
    const bank = rows[0]
    const id = getQuestionIdentity(bank as any).question_id
    const categoryId = String(bank.category_id)
    if (blocked.has(id) || invalidCategories.has(categoryId)) continue
    if (bank.question_id !== id) {
      conflicts.push({ reason: 'noncanonical-bank-id', id, categoryId })
      continue
    }
    const expected = usage.get(key) ?? { courseCodes: new Set<string>(), quizIds: new Map<string, unknown>() }
    const courseCodes = [...expected.courseCodes].sort()
    const quizIds = [...expected.quizIds.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value)
    const storedCodes = normalizeQuestionUsageCodes(bank.used_in_quizzes ?? [])
    const storedQuizIds = [...new Set((bank.used_in_quiz_ids ?? []).map((value: unknown) => String(value)))].sort()
    const expectedQuizIds = quizIds.map(value => String(value)).sort()
    if (bank.usage_count === courseCodes.length && sameArray(bank.used_in_quizzes, storedCodes) &&
      JSON.stringify(storedQuizIds) === JSON.stringify(expectedQuizIds)) continue

    const fields = ['used_in_quizzes', 'usage_count', 'used_in_quiz_ids', '_question_usage_reconciliation']
    const before = fields.map(path => ({ path, exists: Object.prototype.hasOwnProperty.call(bank, path), ...(Object.prototype.hasOwnProperty.call(bank, path) ? { value: bank[path] } : {}) }))
    const filter: Row = { _id: bank._id, category_id: bank.category_id, question_id: bank.question_id, text: bank.text, options: bank.options, correct_answer: bank.correct_answer }
    for (const field of fields) filter[field] = currentValueFilter(bank, field)
    filter._question_usage_reconciliation = currentValueFilter(bank, '_question_usage_reconciliation')
    changes.push({ id: bank._id, filter, set: { used_in_quizzes: courseCodes, usage_count: courseCodes.length, used_in_quiz_ids: quizIds }, before })
  }

  return {
    scannedQuizzes: eligibleQuizzes.length,
    scannedBankRows: bankRows.length,
    blockedCanonicalIds: [...blocked].sort(),
    conflicts,
    changes,
  }
}

interface MigrationDatabase {
  collection(name: string): {
    updateOne(filter: Row, update: Row): Promise<{ matchedCount: number }>
    findOne?(filter: Row): Promise<unknown>
  }
}

export async function applyQuestionUsageCacheChanges(db: MigrationDatabase, changes: UsageCacheChange[], migrationId: string, onResult?: (index: number, state: string) => void) {
  let applied = 0
  for (const [index, change] of changes.entries()) {
    const marker = `${migrationId}:${index}`
    const collection = db.collection('questionbanks')
    onResult?.(index, 'started')
    const result = await collection.updateOne(change.filter, { $set: { ...change.set, _question_usage_reconciliation: marker } })
    const resumed = result.matchedCount === 0 && collection.findOne
      ? await collection.findOne({ ...change.filter, ...change.set, _question_usage_reconciliation: marker }) : null
    const matched = result.matchedCount > 0 || Boolean(resumed)
    if (matched) applied++
    onResult?.(index, matched ? 'applied' : 'skipped')
  }
  return { applied, skipped: changes.length - applied }
}

export async function restoreQuestionUsageCacheChanges(db: MigrationDatabase, changes: UsageCacheChange[], migrationId: string) {
  let applied = 0
  for (const [index, change] of [...changes.entries()].reverse()) {
    const set: Row = {}, unset: Row = {}
    for (const field of change.before) {
      if (field.exists) set[field.path] = field.value
      else unset[field.path] = ''
    }
    const update = { ...(Object.keys(set).length ? { $set: set } : {}), $unset: unset }
    const result = await db.collection('questionbanks').updateOne({ ...change.filter, ...change.set, _question_usage_reconciliation: `${migrationId}:${index}` }, update)
    applied += result.matchedCount
  }
  return { applied, skipped: changes.length - applied }
}
