import type { QuestionFeedback } from './types/session'

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
    ? [...new Set(correctAnswer)].sort((a, b) => a - b)
    : [correctAnswer as number]
  const submittedSorted = [...new Set(answerIndexes)].sort((a, b) => a - b)
  const isCorrect =
    submittedSorted.length === correctAnswerIndexes.length &&
    submittedSorted.every((v, i) => v === correctAnswerIndexes[i])

  return {
    isCorrect,
    correctAnswer: correctAnswerIndexes[0],
    correctAnswers: correctAnswerIndexes,
    explanation,
  }
}
