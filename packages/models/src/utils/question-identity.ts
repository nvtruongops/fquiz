import { generateQuestionId } from './question-id-generator'
import { generateCanonicalQuestionHash } from './ast-normalizer'

interface IdentityQuestion {
  _id?: unknown
  question_id?: string
  question_id_aliases?: string[]
  text: string
  options: string[]
  correct_answer?: number | number[]
}

/** Content revisions share this ID across categories; answer-only corrections retain it. */
export function getQuestionIdentity(question: IdentityQuestion) {
  const question_id = generateQuestionId(question)
  const legacy = [...(question.question_id_aliases ?? []), question.question_id, question._id?.toString()]
  return { question_id, question_id_aliases: [...new Set(legacy.filter((id): id is string => Boolean(id) && id !== question_id))].sort() }
}

export function questionIdentityLookup(id: string) {
  return { $or: [
    { question_id: id }, { question_id_aliases: id },
    ...(/^[a-f\d]{24}$/i.test(id) ? [{ _id: id }] : []),
  ] }
}

/** Resolve legacy aliases and preflight a canonical revision collision before any writer starts. */
export async function resolveQuestionBankRevision(model: { findOne(filter: any): PromiseLike<any> }, category_id: string, oldId: string, source: IdentityQuestion) {
  const previous = await model.findOne({ category_id, ...questionIdentityLookup(oldId) })
  const identity = getQuestionIdentity({ ...source, _id: previous?._id, question_id: previous?.question_id, question_id_aliases: previous?.question_id_aliases })
  const target = await model.findOne({ category_id, question_id: identity.question_id })
  return { previous, identity, conflict: Boolean(target && String(target._id) !== String(previous?._id)) }
}

/** Resolve a snapshot by its full content; aliases alone cannot select a different question. */
export function findQuestionSnapshot<T extends IdentityQuestion>(candidates: T[], target: IdentityQuestion): T | undefined {
  const id = generateQuestionId(target)
  const matches = candidates.filter(q => generateQuestionId(q) === id)
  const fingerprints = new Set(matches.map(q => generateCanonicalQuestionHash({ ...q, correct_answer: q.correct_answer ?? [] })))
  return fingerprints.size === 1 ? matches[0] : undefined
}
