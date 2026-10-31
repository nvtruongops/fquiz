import { generateCanonicalQuestionHash } from '../../packages/models/src/utils/ast-normalizer'
import { getQuestionIdentity } from '../../packages/models/src/utils/question-identity'

type Row = Record<string, any>
type MergeCollection = 'questions' | 'questionbanks'

export interface QuestionAssociationMergeGroup {
  collection: MergeCollection
  association: string
  canonicalId: string
  survivorId: unknown
  survivorBefore: Row
  survivorAfter: Row
  duplicateIds: unknown[]
  duplicates: Row[]
}

export interface QuestionReferenceChange {
  collection: 'quizzes' | 'quizsessions'
  documentId: unknown
  before: unknown[]
  after: unknown[]
}

export interface QuestionAssociationMergeBlock {
  collection: MergeCollection
  association: string
  canonicalId: string
  reason: 'content-or-answer-conflict' | 'metadata-conflict' | 'missing-document-id' | 'canonical-id-occupied'
  documentIds: unknown[]
  metadataFields?: string[]
}

const metadataFields = ['created_by', 'source_type', 'image_url', 'language_id', 'ai_asset_id', 'question_type', 'topic']
const managedFields = new Set([
  '_id', 'question_id', 'question_id_aliases', 'text', 'options', 'correct_answer', 'explanation',
  'category_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt', 'usage_count', 'used_in_quizzes',
  'used_in_quiz_ids', 'quiz_ids', 'vocabulary_ids', 'grammar_ids', 'sentence_ids',
  '_question_identity_migration', '_question_usage_reconciliation', '_question_association_merge', '_reviewed_answer_key_repair', '__v',
  'created_by', 'source_type', 'image_url', 'language_id', 'ai_asset_id', 'question_type', 'topic',
])
const relationFields = ['quiz_ids', 'vocabulary_ids', 'grammar_ids', 'sentence_ids']

function hasContent(row: Row) {
  return typeof row.text === 'string' && row.text.trim().length > 0 && Array.isArray(row.options) &&
    row.options.length >= 2 && row.options.every((option: unknown) => typeof option === 'string' && option.trim().length > 0)
}

function canonicalId(row: Row) {
  return getQuestionIdentity(row as any).question_id
}

function associationKey(collection: MergeCollection, row: Row) {
  const id = canonicalId(row)
  return collection === 'questionbanks' ? JSON.stringify([String(row.category_id ?? ''), id]) : id
}

function answerFingerprint(row: Row) {
  return generateCanonicalQuestionHash({ ...row, correct_answer: row.correct_answer ?? [] } as any)
}

function stableValue(value: unknown) {
  if (value === undefined) return '__undefined__'
  return JSON.stringify(value, (_key, entry) => entry?.toHexString ? entry.toHexString() : entry instanceof Date ? entry.toISOString() : entry)
}

function uniqueValues(values: unknown[]) {
  const seen = new Set<string>()
  return values.filter(value => {
    const key = String(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chooseSurvivor(rows: Row[], canonical: string) {
  return [...rows].sort((left, right) => {
    const leftCanonical = left.question_id === canonical ? 0 : 1
    const rightCanonical = right.question_id === canonical ? 0 : 1
    if (leftCanonical !== rightCanonical) return leftCanonical - rightCanonical
    const leftImage = typeof left.image_url === 'string' && left.image_url.trim() ? 0 : 1
    const rightImage = typeof right.image_url === 'string' && right.image_url.trim() ? 0 : 1
    if (leftImage !== rightImage) return leftImage - rightImage
    const leftReviewed = left._reviewed_answer_key_repair ? 0 : 1
    const rightReviewed = right._reviewed_answer_key_repair ? 0 : 1
    if (leftReviewed !== rightReviewed) return leftReviewed - rightReviewed
    const leftExplanation = typeof left.explanation === 'string' && left.explanation.trim() ? 0 : 1
    const rightExplanation = typeof right.explanation === 'string' && right.explanation.trim() ? 0 : 1
    if (leftExplanation !== rightExplanation) return leftExplanation - rightExplanation
    const leftDate = new Date(left.created_at ?? left.createdAt ?? 0).getTime()
    const rightDate = new Date(right.created_at ?? right.createdAt ?? 0).getTime()
    if (leftDate !== rightDate) return leftDate - rightDate
    return String(left._id).localeCompare(String(right._id))
  })[0]
}

function groupCompatibility(collection: MergeCollection, rows: Row[]) {
  if (new Set(rows.map(answerFingerprint)).size !== 1) return 'content-or-answer-conflict' as const
  const metadataValue = (row: Row, field: string) => field === 'image_url' && !row[field] ? undefined : stableValue(row[field])
  const conflictingFields = metadataFields.filter(field => {
    const values = rows.map(row => metadataValue(row, field)).filter((value): value is string => value !== undefined)
    return new Set(values).size > 1
  })

  const unknownFields = new Set(rows.flatMap(row => Object.keys(row).filter(field => !managedFields.has(field))))
  for (const field of unknownFields) {
    if (new Set(rows.map(row => stableValue(row[field]))).size > 1) conflictingFields.push(field)
  }
  if (collection === 'questionbanks' && new Set(rows.map(row => stableValue(row.category_id))).size > 1) conflictingFields.push('category_id')
  return conflictingFields.length ? { reason: 'metadata-conflict' as const, metadataFields: conflictingFields.sort() } : null
}

function mergeFields(collection: MergeCollection, rows: Row[], survivor: Row, id: string) {
  const aliases = uniqueValues(rows.flatMap(row => [
    ...(Array.isArray(row.question_id_aliases) ? row.question_id_aliases : []),
    ...(typeof row.question_id === 'string' ? [row.question_id] : []),
    ...(row._id == null ? [] : [String(row._id)]),
  ])).filter(alias => alias !== id)
  const merged: Row = { question_id: id, question_id_aliases: aliases }
  const imageUrl = rows.find(row => typeof row.image_url === 'string' && row.image_url.trim())?.image_url
  if (imageUrl) merged.image_url = imageUrl
  const versions = rows.map(row => row.__v).filter(Number.isSafeInteger)
  if (versions.length) merged.__v = Math.max(...versions)
  const reviewedMarker = survivor._reviewed_answer_key_repair ?? rows.find(row => row._reviewed_answer_key_repair)?._reviewed_answer_key_repair
  if (reviewedMarker !== undefined) merged._reviewed_answer_key_repair = reviewedMarker
  if (collection === 'questions') {
    for (const field of relationFields) merged[field] = uniqueValues(rows.flatMap(row => Array.isArray(row[field]) ? row[field] : []))
    merged.usage_count = Math.max(...rows.map(row => Number.isSafeInteger(row.usage_count) ? row.usage_count : 0), merged.quiz_ids.length)
  }
  // Keep the deterministic survivor's explanation and timestamps; all removed records are archived in full.
  return merged
}

function referenceChanges(collection: 'quizzes' | 'quizsessions', documents: Row[], field: string, idMap: Map<string, unknown>) {
  const changes: QuestionReferenceChange[] = []
  for (const document of documents) {
    const before = Array.isArray(document[field]) ? document[field] : []
    const after = before.map((id: unknown) => {
      const target = idMap.get(String(id))
      return target === undefined ? id : typeof id === 'string' ? String(target) : target
    })
    if (before.some((id: unknown, index: number) => String(id) !== String(after[index]))) {
      changes.push({ collection, documentId: document._id, before: [...before], after })
    }
  }
  return changes
}

/** Plans only identity-equivalent merges; answer/content conflicts stay blocked for review. */
export function buildQuestionAssociationMergePlan(collections: Record<string, Row[]>) {
  const groups: QuestionAssociationMergeGroup[] = []
  const blocked: QuestionAssociationMergeBlock[] = []
  const questionIdMap = new Map<string, unknown>()

  for (const collection of ['questions', 'questionbanks'] as const) {
    const rowsForCollection = collections[collection] ?? []
    const currentOwners = new Map<string, Set<string>>()
    for (const row of rowsForCollection) {
      if (typeof row.question_id !== 'string') continue
      const currentAssociation = collection === 'questionbanks'
        ? JSON.stringify([String(row.category_id ?? ''), row.question_id])
        : row.question_id
      const owners = currentOwners.get(currentAssociation) ?? new Set<string>()
      owners.add(String(row._id))
      currentOwners.set(currentAssociation, owners)
    }
    const grouped = new Map<string, Row[]>()
    for (const row of rowsForCollection) {
      if (!hasContent(row)) continue
      const key = associationKey(collection, row)
      const rows = grouped.get(key) ?? []
      rows.push(row)
      grouped.set(key, rows)
    }
    for (const [association, rows] of grouped) {
      if (rows.length < 2) continue
      const canonical = canonicalId(rows[0])
      const missingId = rows.some(row => row._id === undefined || row._id === null)
      const incompatibility = groupCompatibility(collection, rows)
      const occupied = (currentOwners.get(collection === 'questionbanks' ? JSON.stringify([String(rows[0].category_id ?? ''), canonical]) : canonical) ?? new Set())
      const currentCanonicalOwners = [...occupied].filter(owner => !rows.some(row => String(row._id) === owner))
      if (missingId || incompatibility || currentCanonicalOwners.length) {
        const reason = missingId ? 'missing-document-id' : typeof incompatibility === 'string' ? incompatibility : incompatibility?.reason ?? 'canonical-id-occupied'
        blocked.push({ collection, association, canonicalId: canonical, reason, documentIds: [...rows.map(row => row._id), ...currentCanonicalOwners], ...(typeof incompatibility === 'object' && incompatibility?.metadataFields ? { metadataFields: incompatibility.metadataFields } : {}) })
        continue
      }
      const survivor = chooseSurvivor(rows, canonical)
      const losers = rows.filter(row => String(row._id) !== String(survivor._id))
      const merged = mergeFields(collection, rows, survivor, canonical)
      groups.push({
        collection,
        association,
        canonicalId: canonical,
        survivorId: survivor._id,
        survivorBefore: survivor,
        survivorAfter: merged,
        duplicateIds: losers.map(row => row._id),
        duplicates: losers,
      })
      if (collection === 'questions') for (const loser of losers) questionIdMap.set(String(loser._id), survivor._id)
    }
  }

  const references = [
    ...referenceChanges('quizzes', collections.quizzes ?? [], 'question_refs', questionIdMap),
    ...referenceChanges('quizsessions', collections.quizsessions ?? [], 'question_ids', questionIdMap),
  ]
  groups.sort((left, right) => `${left.collection}:${left.association}`.localeCompare(`${right.collection}:${right.association}`))
  blocked.sort((left, right) => `${left.collection}:${left.association}`.localeCompare(`${right.collection}:${right.association}`))
  references.sort((left, right) => `${left.collection}:${String(left.documentId)}`.localeCompare(`${right.collection}:${String(right.documentId)}`))
  return { groups, blocked, references }
}
