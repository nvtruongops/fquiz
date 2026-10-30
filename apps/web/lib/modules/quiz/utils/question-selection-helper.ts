import { getExplicitAnswerSelectionCount } from '@fquiz/models'

/**
 * Helper to compute the required answer selection count for a question.
 * Combines explicit correct_answer length with text pattern matching
 * (e.g., "(Choose two.)", "(Choose 2)", "(Select two)", "(Chọn 2 đáp án)", etc.).
 */
export function getAnswerSelectionCount(question: {
  text?: string
  correct_answer?: unknown
  options?: unknown[]
}): number {
  if (!question) return 1

  const optionsLength = Array.isArray(question.options) ? Math.max(question.options.length, 2) : 4

  // 1. Calculate from correct_answer array length if available
  let countFromAnswer = 1
  if (Array.isArray(question.correct_answer)) {
    countFromAnswer = question.correct_answer.length
  } else if (typeof question.correct_answer === 'number') {
    countFromAnswer = 1
  }

  // 2. Infer from explicit instructions in the question text
  const countFromText = getExplicitAnswerSelectionCount(question.text) ?? 0

  const effectiveCount = Math.max(countFromAnswer, countFromText, 1)
  return Math.min(effectiveCount, optionsLength)
}
