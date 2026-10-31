import { getQuestionIdentity } from '../../packages/models/src/utils/question-identity'
import { normalizeOptionAST } from '../../packages/models/src/utils/ast-normalizer'

type SourceCollection = 'questions' | 'questionbanks' | 'quizzes' | 'pinnedquestions' | 'quizsessions'
type Row = Record<string, any>

export interface ReviewedAnswerResolution {
  canonicalId: string
  answerTexts: string[]
}

export interface AnswerRepairSnapshot {
  collection: SourceCollection
  documentId: unknown
  question: Row
  questionIndex?: number
}

export interface ReviewedAnswerRepairChange {
  collection: Exclude<SourceCollection, 'quizsessions'>
  documentId: unknown
  itemId?: unknown
  questionIndex?: number
  text: string
  options: string[]
  beforeExists: boolean
  before?: unknown
  beforeMarkerExists: boolean
  beforeMarker?: unknown
  after: number[]
}

export interface ReviewedAnswerRepairBlock {
  canonicalId: string
  reason: 'duplicate-resolution' | 'answer-option-not-unique' | 'missing-occurrences' | 'quiz-item-missing-stable-id' | 'duplicate-quiz-item-id'
  documentId?: unknown
  questionIndex?: number
}

function answerIndexes(options: string[], answerTexts: string[]) {
  if (!answerTexts.length || new Set(answerTexts.map(normalizeOptionAST)).size !== answerTexts.length) return null
  const indexes = answerTexts.map(answer => {
    const normalized = normalizeOptionAST(answer)
    const matches = options.flatMap((option, index) => normalizeOptionAST(option) === normalized ? [index] : [])
    return matches.length === 1 ? matches[0] : -1
  })
  if (indexes.some(index => index < 0) || new Set(indexes).size !== indexes.length) return null
  return indexes.sort((left, right) => left - right)
}

/** Plans answer-only changes from an explicit, reviewed mapping. Session snapshots are immutable. */
export function planReviewedAnswerKeyRepair(
  snapshots: AnswerRepairSnapshot[],
  resolutions: ReviewedAnswerResolution[],
) {
  const resolutionById = new Map<string, ReviewedAnswerResolution>()
  const duplicateIds = new Set<string>()
  for (const resolution of resolutions) {
    if (resolutionById.has(resolution.canonicalId)) duplicateIds.add(resolution.canonicalId)
    resolutionById.set(resolution.canonicalId, resolution)
  }

  const candidates = new Map<string, AnswerRepairSnapshot[]>()
  const quizItemCounts = new Map<string, number>()
  for (const snapshot of snapshots) {
    if (snapshot.collection === 'quizsessions') continue
    const identity = getQuestionIdentity(snapshot.question as any).question_id
    if (!resolutionById.has(identity)) continue
    const rows = candidates.get(identity) ?? []
    rows.push(snapshot)
    candidates.set(identity, rows)
    if (snapshot.collection === 'quizzes' && snapshot.question?._id != null) {
      const key = `${String(snapshot.documentId)}:${String(snapshot.question._id)}`
      quizItemCounts.set(key, (quizItemCounts.get(key) ?? 0) + 1)
    }
  }

  const changes: ReviewedAnswerRepairChange[] = []
  const blocked: ReviewedAnswerRepairBlock[] = []
  for (const [canonicalId, resolution] of resolutionById) {
    const rows = candidates.get(canonicalId) ?? []
    if (duplicateIds.has(canonicalId)) {
      blocked.push({ canonicalId, reason: 'duplicate-resolution' })
      continue
    }
    if (!rows.length) {
      blocked.push({ canonicalId, reason: 'missing-occurrences' })
      continue
    }

    const planned: ReviewedAnswerRepairChange[] = []
    let mappingFailed = false
    for (const row of rows) {
      if (row.collection === 'quizsessions') continue
      const next = answerIndexes(row.question.options, resolution.answerTexts)
      if (!next) {
        blocked.push({ canonicalId, reason: 'answer-option-not-unique', documentId: row.documentId, questionIndex: row.questionIndex })
        mappingFailed = true
        continue
      }
      if (row.collection === 'quizzes' && row.question?._id == null) {
        blocked.push({ canonicalId, reason: 'quiz-item-missing-stable-id', documentId: row.documentId, questionIndex: row.questionIndex })
        mappingFailed = true
        continue
      }
      if (row.collection === 'quizzes' && quizItemCounts.get(`${String(row.documentId)}:${String(row.question._id)}`)! > 1) {
        blocked.push({ canonicalId, reason: 'duplicate-quiz-item-id', documentId: row.documentId, questionIndex: row.questionIndex })
        mappingFailed = true
        continue
      }
      const current = Array.isArray(row.question.correct_answer)
        ? [...row.question.correct_answer].sort((a, b) => a - b)
        : Number.isSafeInteger(row.question.correct_answer) ? [row.question.correct_answer] : []
      if (JSON.stringify(current) === JSON.stringify(next)) continue
      const hasMarker = Object.prototype.hasOwnProperty.call(row.question, '_reviewed_answer_key_repair')
      planned.push({
        collection: row.collection,
        documentId: row.documentId,
        ...(row.collection === 'quizzes' ? { itemId: row.question._id, questionIndex: row.questionIndex } : {}),
        text: row.question.text,
        options: [...row.question.options],
        beforeExists: Object.prototype.hasOwnProperty.call(row.question, 'correct_answer'),
        ...(Object.prototype.hasOwnProperty.call(row.question, 'correct_answer') ? { before: row.question.correct_answer } : {}),
        beforeMarkerExists: hasMarker,
        ...(hasMarker ? { beforeMarker: row.question._reviewed_answer_key_repair } : {}),
        after: next,
      })
    }
    if (!mappingFailed) changes.push(...planned)
  }

  return { changes, blocked }
}

interface RepairCollection {
  updateOne(filter: Row, update: Row, options?: Row): Promise<{ matchedCount: number; modifiedCount?: number }>
  findOne?(filter: Row): Promise<Row | null>
}
interface RepairDatabase { collection(name: string): RepairCollection }

function answerCondition(change: ReviewedAnswerRepairChange, value: unknown, exists: boolean, prefix = ''): Row {
  const condition: Row = { [`${prefix}text`]: change.text, [`${prefix}options`]: change.options }
  condition[`${prefix}correct_answer`] = exists ? value : { $exists: false }
  return condition
}

function markerCondition(change: ReviewedAnswerRepairChange, value: unknown, exists: boolean, prefix = ''): Row {
  return { [`${prefix}_reviewed_answer_key_repair`]: exists ? value : { $exists: false } }
}

function simpleFilter(change: ReviewedAnswerRepairChange, answer: unknown, answerExists: boolean, marker: unknown, markerExists: boolean) {
  return {
    _id: change.documentId,
    ...answerCondition(change, answer, answerExists),
    ...markerCondition(change, marker, markerExists),
  }
}

function embeddedArrayFilter(change: ReviewedAnswerRepairChange, answer: unknown, answerExists: boolean, marker: unknown, markerExists: boolean) {
  return {
    'question._id': change.itemId,
    ...answerCondition(change, answer, answerExists, 'question.'),
    ...markerCondition(change, marker, markerExists, 'question.'),
  }
}

function embeddedParentFilter(change: ReviewedAnswerRepairChange) {
  return { _id: change.documentId }
}

function embeddedResumeFilter(change: ReviewedAnswerRepairChange, answer: unknown, marker: unknown) {
  return {
    _id: change.documentId,
    questions: { $elemMatch: {
      _id: change.itemId,
      ...answerCondition(change, answer, true),
      ...markerCondition(change, marker, true),
    } },
  }
}

function updateFor(change: ReviewedAnswerRepairChange, answer: unknown, marker: string, restoring: boolean, previousMarker?: unknown, previousMarkerExists = false) {
  const fields: Row = {}, unset: Row = {}
  const answerPath = change.collection === 'quizzes' ? 'questions.$[question].correct_answer' : 'correct_answer'
  const markerPath = change.collection === 'quizzes' ? 'questions.$[question]._reviewed_answer_key_repair' : '_reviewed_answer_key_repair'
  if (restoring && !change.beforeExists) unset[answerPath] = ''
  else fields[answerPath] = answer
  if (restoring && !previousMarkerExists) unset[markerPath] = ''
  else fields[markerPath] = restoring ? previousMarker : marker
  return { ...(Object.keys(fields).length ? { $set: fields } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) }
}

function ownedFilter(change: ReviewedAnswerRepairChange, answer: unknown, marker: string) {
  if (change.collection !== 'quizzes') return simpleFilter(change, answer, true, marker, true)
  return {
    ...embeddedParentFilter(change),
    questions: { $elemMatch: {
      _id: change.itemId,
      ...answerCondition(change, answer, true),
      ...markerCondition(change, marker, true),
    } },
  }
}

function beforeFilter(change: ReviewedAnswerRepairChange) {
  if (change.collection !== 'quizzes') {
    return simpleFilter(change, change.before, change.beforeExists, change.beforeMarker, change.beforeMarkerExists)
  }
  return {
    ...embeddedParentFilter(change),
    questions: { $elemMatch: {
      _id: change.itemId,
      ...answerCondition(change, change.before, change.beforeExists),
      ...markerCondition(change, change.beforeMarker, change.beforeMarkerExists),
    } },
  }
}

/** Applies only the exact answer-key changes in a reviewed EJSON journal. */
export async function applyReviewedAnswerKeyChanges(
  db: RepairDatabase,
  changes: ReviewedAnswerRepairChange[],
  migrationId: string,
  onResult?: (index: number, state: string) => void,
) {
  let applied = 0
  for (const [index, change] of changes.entries()) {
    const marker = `${migrationId}:${index}`
    onResult?.(index, 'started')
    const collection = db.collection(change.collection)
    const update = updateFor(change, change.after, marker, false)
    const result = change.collection === 'quizzes'
      ? await collection.updateOne(embeddedParentFilter(change), update, { arrayFilters: [embeddedArrayFilter(change, change.before, change.beforeExists, change.beforeMarker, change.beforeMarkerExists)] })
      : await collection.updateOne(simpleFilter(change, change.before, change.beforeExists, change.beforeMarker, change.beforeMarkerExists), update)
    const resumed = result.modifiedCount === 0 && collection.findOne
      ? await collection.findOne(change.collection === 'quizzes'
        ? embeddedResumeFilter(change, change.after, marker)
        : simpleFilter(change, change.after, true, marker, true))
      : null
    const succeeded = result.modifiedCount === 1 || Boolean(resumed)
    if (succeeded) applied++
    onResult?.(index, succeeded ? 'applied' : 'skipped')
  }
  return { applied, skipped: changes.length - applied }
}

/** Restores only rows still carrying this migration's marker and exact after-state. */
export async function restoreReviewedAnswerKeyChanges(db: RepairDatabase, changes: ReviewedAnswerRepairChange[], migrationId: string) {
  let restored = 0
  for (const [index, change] of [...changes.entries()].reverse()) {
    const marker = `${migrationId}:${index}`
    const collection = db.collection(change.collection)
    const filter = ownedFilter(change, change.after, marker)
    const update = updateFor(change, change.before, marker, true, change.beforeMarker, change.beforeMarkerExists)
    const result = change.collection === 'quizzes'
      ? await collection.updateOne(embeddedParentFilter(change), update, { arrayFilters: [embeddedArrayFilter(change, change.after, true, marker, true)] })
      : await collection.updateOne(filter, update)
    const restoredState = beforeFilter(change)
    const resumed = result.modifiedCount === 0 && collection.findOne ? await collection.findOne(restoredState) : null
    if (result.modifiedCount === 1 || resumed) restored++
  }
  return { restored, skipped: changes.length - restored }
}
