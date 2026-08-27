import crypto from 'crypto'
import { getAnswerTexts, areAnswersSame } from './array-utils'
import { normalizeTextAST, normalizeOptionAST } from './ast-normalizer'

export function generateQuestionId(question: {
  text: string
  options: string[]
  correct_answer?: number | number[]
}): string {
  const normalizedText = normalizeTextAST(question.text)
  
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

export { getAnswerTexts, areAnswersSame }

export function areQuestionsDuplicate(
  q1: { text: string; options: string[]; correct_answer: number | number[] },
  q2: { text: string; options: string[]; correct_answer: number | number[] }
): boolean {
  return generateQuestionId(q1) === generateQuestionId(q2)
}

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
