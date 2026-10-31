import { generateQuestionId } from '../../packages/models/src/utils/question-id-generator'
import { generateCanonicalQuestionHash } from '../../packages/models/src/utils/ast-normalizer'
import { getPublishedAnswerError } from '../../packages/models/src/utils/published-answer'

type Row = Record<string, any>
export interface EvidenceWarning { reason: string; id: string; collection?: string; variants?: string[] }
function contentExists(q: Row) { return typeof q.text === 'string' && Array.isArray(q.options) && q.options.every((v: unknown) => typeof v === 'string') }
function addVariant(index: Map<string, Set<string>>, key: string, value: string) {
  const values = index.get(key) ?? new Set<string>()
  values.add(value)
  index.set(key, values)
}
function code(value: unknown) { return typeof value === 'string' ? value.trim().toUpperCase() : '' }
function inspectSnapshots(collections: Record<string, Row[]>, warnings: EvidenceWarning[]) {
  const legacy = new Map<string, Set<string>>(), keys = new Map<string, Set<string>>()
  for (const [collection, rows] of Object.entries(collections)) {
    const snapshots = collection === 'quizzes' ? rows.flatMap(r => r.questions ?? []) : collection === 'quizsessions' ? rows.flatMap(r => r.questions_cache ?? []) : rows
    for (const q of snapshots.filter(contentExists)) {
      const id = generateQuestionId(q as any)
      if (q.question_id) addVariant(legacy, q.question_id, id)
      if (getPublishedAnswerError(q as any)) warnings.push({ collection, id: String(q._id ?? id), reason: 'invalid-answer-evidence' })
      else if (collection !== 'quizsessions' && collection !== 'pinnedquestions') addVariant(keys, id, generateCanonicalQuestionHash(q as any))
    }
  }
  for (const [id, variants] of legacy) if (variants.size > 1) warnings.push({ id, reason: 'legacy-id-has-multiple-content-revisions', variants: [...variants] })
  for (const [id, variants] of keys) if (variants.size > 1) warnings.push({ id, reason: 'answer-key-variants', variants: [...variants] })
}

function collectActualUsage(collections: Record<string, Row[]>, warnings: EvidenceWarning[]) {
  const standalone = new Map((collections.questions ?? []).map(q => [String(q._id), q]))
  const usage = new Map<string, Set<string>>()
  for (const quiz of collections.quizzes ?? []) {
    const references = (quiz.question_refs ?? []).map((id: unknown) => {
      const question = standalone.get(String(id))
      if (!question) warnings.push({ collection: 'quizzes', id: String(quiz._id), reason: 'dangling-question-reference' })
      return question
    }).filter(Boolean)
    const courseCode = code(quiz.course_code)
    if (quiz.status !== 'published' || quiz.is_temp || quiz.is_saved_from_explore || !courseCode) continue
    for (const q of [...(quiz.questions ?? []), ...references].filter(contentExists)) {
      addVariant(usage, `${quiz.category_id}:${generateQuestionId(q)}`, courseCode)
    }
  }
  return usage
}

export function auditQuestionEvidence(collections: Record<string, Row[]>): EvidenceWarning[] {
  const warnings: EvidenceWarning[] = []
  inspectSnapshots(collections, warnings)
  const usage = collectActualUsage(collections, warnings)
  for (const bank of collections.questionbanks ?? []) {
    if (!bank.created_by) warnings.push({ collection: 'questionbanks', id: String(bank._id), reason: 'missing-bank-creator' })
    if (!contentExists(bank)) continue
    const actual = [...(usage.get(`${bank.category_id}:${generateQuestionId(bank as any)}`) ?? [])].sort()
    const cached = [...new Set((bank.used_in_quizzes ?? []).map(code).filter(Boolean))].sort()
    if (JSON.stringify(actual) !== JSON.stringify(cached) || bank.usage_count !== actual.length) {
      warnings.push({ collection: 'questionbanks', id: String(bank._id), reason: 'bank-usage-cache-mismatch' })
    }
  }
  const pins = new Map<string, Set<string>>()
  for (const pin of (collections.pinnedquestions ?? []).filter(contentExists)) addVariant(pins, `${pin.student_id}:${generateQuestionId(pin as any)}`, String(pin._id))
  for (const [id, variants] of pins) if (variants.size > 1) warnings.push({ collection: 'pinnedquestions', id, reason: 'duplicate-student-canonical-pin', variants: [...variants] })
  return warnings
}
