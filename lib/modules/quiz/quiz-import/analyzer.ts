import type { QuestionStructureReport } from './types'

export function analyzeQuestionStructure(
  questions: Array<{ options: string[]; correct_answer: number[] | number }>
): QuestionStructureReport {
  let standardCount = 0
  let singleCorrectCount = 0
  let multiCorrectCount = 0
  let zeroCorrectCount = 0
  const multiCorrectBreakdown: Record<number, number> = {}

  let fourOptionsCount = 0
  let lessThanFourOptionsCount = 0
  const lessThanFourBreakdown: Record<number, number> = {}
  let moreThanFourOptionsCount = 0
  const moreThanFourBreakdown: Record<number, number> = {}

  const nonStandardQuestions: QuestionStructureReport['nonStandardQuestions'] = []

  questions.forEach((q, idx) => {
    const opts = q.options || []
    const optionCount = opts.length

    let rawAnswers: number[] = []
    if (Array.isArray(q.correct_answer)) {
      rawAnswers = q.correct_answer
    } else if (typeof q.correct_answer === 'number' && !isNaN(q.correct_answer)) {
      rawAnswers = [q.correct_answer]
    }
    const correctCount = rawAnswers.length

    // Option distribution
    if (optionCount === 4) {
      fourOptionsCount++
    } else if (optionCount < 4) {
      lessThanFourOptionsCount++
      lessThanFourBreakdown[optionCount] = (lessThanFourBreakdown[optionCount] || 0) + 1
    } else {
      moreThanFourOptionsCount++
      moreThanFourBreakdown[optionCount] = (moreThanFourBreakdown[optionCount] || 0) + 1
    }

    // Correct answer distribution
    if (correctCount === 1) {
      singleCorrectCount++
    } else if (correctCount === 0) {
      zeroCorrectCount++
    } else {
      multiCorrectCount++
      multiCorrectBreakdown[correctCount] = (multiCorrectBreakdown[correctCount] || 0) + 1
    }

    // Standard check: 4 options AND 1 correct answer
    const isStandard = optionCount === 4 && correctCount === 1
    if (isStandard) {
      standardCount++
    } else {
      const reasons: string[] = []
      if (optionCount !== 4) {
        reasons.push(`${optionCount} phương án (chuẩn là 4)`)
      }
      if (correctCount !== 1) {
        reasons.push(correctCount === 0 ? '0 đáp án đúng' : `${correctCount} đáp án đúng (chuẩn là 1)`)
      }
      nonStandardQuestions.push({
        questionIndex: idx,
        optionCount,
        correctCount,
        reasons,
      })
    }
  })

  return {
    total: questions.length,
    standardCount,
    nonStandardCount: nonStandardQuestions.length,
    singleCorrectCount,
    multiCorrectCount,
    multiCorrectBreakdown,
    zeroCorrectCount,
    fourOptionsCount,
    lessThanFourOptionsCount,
    lessThanFourBreakdown,
    moreThanFourOptionsCount,
    moreThanFourBreakdown,
    nonStandardQuestions,
  }
}
