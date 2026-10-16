/**
 * Automatic Quiz Question Explanation Generator
 *
 * Ensures every quiz question has a clean, meaningful explanation.
 * Used across Quiz pre-save hooks, Question pre-save hooks, and quiz import normalizers.
 */

export interface QuestionExplanationInput {
  text?: string
  options?: string[]
  correct_answer?: number | number[]
  explanation?: string | null
}

/**
 * Normalizes answer indices into an array of numbers.
 */
function normalizeAnswerIndices(correctAnswer?: number | number[]): number[] {
  if (correctAnswer === undefined || correctAnswer === null) return []
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.filter((idx) => typeof idx === 'number' && Number.isInteger(idx))
  }
  if (typeof correctAnswer === 'number' && Number.isInteger(correctAnswer)) {
    return [correctAnswer]
  }
  return []
}

/**
 * Generates an explanation for a question if one is missing or empty.
 */
function generateFallbackExplanation(
  text: string,
  options: string[],
  correctAnswers: number[]
): string {
  const cleanText = text ? text.trim() : ''

  if (!options || options.length === 0 || !correctAnswers || correctAnswers.length === 0) {
    return 'The correct answer is based on the question content.'
  }

  const correctTexts = correctAnswers
    .filter((idx) => idx >= 0 && idx < options.length)
    .map((idx) => `"${options[idx].trim()}"`)

  if (correctTexts.length === 0) {
    return 'The correct answer is based on the question content.'
  }

  if (correctTexts.length === 1) {
    return cleanText
      ? `The correct answer is ${correctTexts[0]} because it accurately satisfies the question "${cleanText}".`
      : `The correct answer is ${correctTexts[0]}.`
  }

  return cleanText
    ? `The correct answers are: ${correctTexts.join(', ')} because they satisfy the conditions in "${cleanText}".`
    : `The correct answers are: ${correctTexts.join(', ')}.`
}

/**
 * Returns existing explanation if valid, or automatically generates a fallback explanation.
 */
export function ensureExplanation(q: QuestionExplanationInput): string {
  if (q.explanation && typeof q.explanation === 'string' && q.explanation.trim() !== '') {
    return q.explanation.trim()
  }

  const text = q.text || ''
  const options = Array.isArray(q.options) ? q.options : []
  const correctAnswers = normalizeAnswerIndices(q.correct_answer)

  return generateFallbackExplanation(text, options, correctAnswers)
}
