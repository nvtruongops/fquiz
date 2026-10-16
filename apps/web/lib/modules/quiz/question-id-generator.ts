import crypto from 'crypto'
import { getAnswerTexts, areAnswersSame } from '@/lib/core/utils/array-utils'
import { normalizeTextAST, normalizeOptionAST } from '@/lib/modules/quiz/utils/ast-normalizer'

/**
 * LEGACY HASH STRATEGY (Conflict Detection): AST-normalized text + sorted options
 * Used for QuestionBank – detects answer conflicts between quizzes.
 * DOES NOT include correct_answer → same question + same options but different answer → SAME ID → conflict.
 */
export function generateQuestionId(question: {
  text: string
  options: string[]
  correct_answer?: number | number[]
}): string {
  const normalizedText = normalizeTextAST(question.text)
  
  // Sort options so order does not matter
  const normalizedOptions = question.options
    .map(o => normalizeOptionAST(o))
    .sort((a, b) => a.localeCompare(b))
  
  const content = JSON.stringify({
    text: normalizedText,
    options: normalizedOptions,
  })
  
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  return `q_${hash.substring(0, 16)}`
}


/**
 * NEW FINGERPRINT STRATEGY (Exact Deduplication): language + text + options + correct_answer + type
 *
 * Used for Question collection (Phase 1+) – identifies identical questions to reuse,
 * not for conflict detection. Correct_answer is included in the hash to differentiate:
 * - Same question + same options + different answer → DIFFERENT fingerprint → create new ✅
 * - Same question + same options + same answer → SAME fingerprint → reuse ✅
 *
 * Forward-compatible: language, question_type, topic are included in fingerprint
 * to prepare for Phase 2+ when Question links with Learning Objects.
 */
export function generateQuestionFingerprint(q: {
  text: string
  options: string[]
  correct_answer: number | number[]
  language?: string
  question_type?: string
  topic?: string
}): string {
  const normalizedText = normalizeTextAST(q.text)
  const normalizedOptions = q.options
    .map((o) => normalizeOptionAST(o))
    .sort((a, b) => a.localeCompare(b))
  const answerIndexes = Array.isArray(q.correct_answer)
    ? [...q.correct_answer].sort((a, b) => a - b)
    : [q.correct_answer]

  const payload = {
    lang: (q.language || 'unknown').toLowerCase().trim(),
    text: normalizedText,
    opts: normalizedOptions,
    ans: answerIndexes,
    type: (q.question_type || 'single_choice').toLowerCase().trim(),
    topic: (q.topic || '').toLowerCase().trim(),
  }

  const hash = crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex')
  return `fp_${hash.substring(0, 20)}`
}

/**
 * Prevents false conflicts when options are reordered between quizzes.
 * 
 * Example:
 * Quiz A: options=["True","False","Unknown"], answer=[0] → answer text = "True"
 * Quiz B: options=["False","True","Unknown"], answer=[1] → answer text = "True"
 * → SAME answer (no conflict) ✅
 */
export { getAnswerTexts, areAnswersSame }

/**
 * Check if two questions are duplicates based on content
 */
export function areQuestionsDuplicate(
  q1: { text: string; options: string[]; correct_answer: number | number[] },
  q2: { text: string; options: string[]; correct_answer: number | number[] }
): boolean {
  return generateQuestionId(q1) === generateQuestionId(q2)
}

/**
 * Find duplicate questions within an array
 * Returns map of question_id -> array of indices
 */
export function findDuplicateQuestions(
  questions: Array<{ text: string; options: string[]; correct_answer: number | number[] }>
): Map<string, number[]> {
  const idToIndices = new Map<string, number[]>()
  
  questions.forEach((q, index) => {
    const qid = generateQuestionId(q)
    const existing = idToIndices.get(qid) || []
    existing.push(index)
    idToIndices.set(qid, existing)
  })
  
  const duplicates = new Map<string, number[]>()
  idToIndices.forEach((indices, qid) => {
    if (indices.length > 1) {
      duplicates.set(qid, indices)
    }
  })
  
  return duplicates
}
