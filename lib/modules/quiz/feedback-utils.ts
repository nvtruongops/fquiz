import type { QuestionFeedback } from './types/session'
import { normalizeIndexes, isExactArrayMatch } from '@/lib/core/utils/array-utils'

/**
 * Compute answer feedback from question data and submitted answer indexes.
 * Returns null if correctAnswer is undefined (e.g., preloaded data hasn't
 * populated it yet).
 *
 * Shared between desktop and mobile session pages to avoid duplicated
 * normalisation and comparison logic.
 */
export function computeQuestionFeedback(
  correctAnswer: number | number[] | undefined,
  answerIndexes: number[],
  explanation?: string,
): QuestionFeedback | null {
  if (correctAnswer === undefined) return null

  const correctAnswerIndexes = Array.isArray(correctAnswer)
    ? normalizeIndexes(correctAnswer)
    : [correctAnswer as number]
  const submittedSorted = normalizeIndexes(answerIndexes)
  const isCorrect = isExactArrayMatch(submittedSorted, correctAnswerIndexes)

  return {
    isCorrect,
    correctAnswer: correctAnswerIndexes[0],
    correctAnswers: correctAnswerIndexes,
    explanation,
  }
}
