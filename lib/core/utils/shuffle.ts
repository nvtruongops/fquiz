import crypto from 'crypto'

/** Fisher-Yates shuffle using a cryptographically secure RNG. */
export function secureShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    /* eslint-disable security/detect-object-injection */
    const j = crypto.randomInt(0, i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    /* eslint-enable security/detect-object-injection */
  }
  return shuffled
}

/* eslint-disable security/detect-unsafe-regex */
const DEPENDENT_OPTION_PATTERNS = [
  /tất\s+cả/i,
  /không\s+(có\s+)?(đáp\s+án|phương\s+án|ý|câu)\s+nào/i,
  /cả\s+\d+\s*(đáp\s+án|phương\s+án|ý)/i,
  /cả\s+(hai|ba|bốn|năm)\s*(đáp\s+án|phương\s+án|ý)/i,
  /(đáp\s+án|phương\s+án|ý)\s+trên/i,
  /cả\s+trên/i,
  /cả\s+ý/i,
  // References to letter labels (A, B, C, D, E, F, G, H...) like "A và B", "Cả A, B, C", "Gồm A và E"
  /(?:cả|gồm|bao\s+gồm|chỉ|ý|đáp\s+án|phương\s+án|câu)?\s*\b[A-H]\b\s*(?:,|và)\s*\b[A-H]\b/i,
  /\b[A-H]\s*,\s*[A-H]\b/i,
  /\b[A-H]\b\s*(?:và|,)\s*\b[A-H]\b\s*(?:đều\s+)?(?:đúng|sai)/i,
]
/* eslint-enable security/detect-unsafe-regex */

/**
 * Strips leading option prefixes like "A. ", "B) ", "[C] ", "D: ", "E. ", "F. ", "G. ", "H. "
 * so shuffled choices don't contain stale letter labels.
 */
export function stripOptionPrefix(text: string): string {
  if (typeof text !== 'string') return text
  /* eslint-disable security/detect-unsafe-regex */
  return text.replace(/^\s*(?:\[[A-Za-z0-9]\]|[A-Za-z0-9][.\):])\s*/, '').trim()
  /* eslint-enable security/detect-unsafe-regex */
}


export function hasDependentOptions(options: string[]): boolean {
  if (!Array.isArray(options)) return false
  return options.some((opt) =>
    typeof opt === 'string' && DEPENDENT_OPTION_PATTERNS.some((pattern) => pattern.test(opt))
  )
}

export interface QuestionWithOptions {
  options: string[]
  correct_answer: number | number[]
  [key: string]: any
}

/**
 * Shuffles question options and updates correct_answer indices accordingly.
 * Supports single-answer (number or [number]) and multi-answer ([number, number, ...]).
 * Preserves questions that have dependent options (e.g. "Tất cả các đáp án trên", "Cả A và B").
 * Cleans leading prefixes like "A. ", "B. ", "C. ", "D. ", "E. ", "F. ", "G. ", "H. ".
 */
export function shuffleQuestionOptions<T extends QuestionWithOptions>(question: T): T {
  if (!question || !Array.isArray(question.options) || question.options.length < 2) {
    return question
  }

  // If question options contain dependent phrases like "Tất cả đáp án trên" or "Cả A và B", skip shuffling
  if (hasDependentOptions(question.options)) {
    return question
  }

  const isSingleNumber = typeof question.correct_answer === 'number'
  const originalCorrect = Array.isArray(question.correct_answer)
    ? question.correct_answer
    : typeof question.correct_answer === 'number'
      ? [question.correct_answer]
      : []

  // Clean option prefixes (e.g. "A. ", "B. ", "C) ", "[D] ", "E. ", "F. ", "G. ", "H. ")
  const cleanedOptions = question.options.map((opt) => stripOptionPrefix(opt))

  const indices = secureShuffle(Array.from({ length: cleanedOptions.length }, (_, i) => i))

  /* eslint-disable security/detect-object-injection */
  const newOptions = indices.map((i) => cleanedOptions[i])

  // Map original correct indices to new indices:
  // indices[newPos] === oldIdx, so newPos = indices.indexOf(oldIdx)
  const newCorrectIndices = originalCorrect
    .map((oldIdx) => indices.indexOf(oldIdx))
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b)
  /* eslint-enable security/detect-object-injection */

  const newCorrectAnswer = isSingleNumber
    ? (newCorrectIndices[0] ?? question.correct_answer)
    : newCorrectIndices

  return {
    ...question,
    options: newOptions,
    correct_answer: newCorrectAnswer,
  }
}


