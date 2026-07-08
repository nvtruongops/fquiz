import { computeQuestionFeedback } from '../feedback-utils'

describe('computeQuestionFeedback', () => {
  it('should return null for undefined correctAnswer', () => {
    expect(computeQuestionFeedback(undefined, [0])).toBeNull()
  })

  it('should return isCorrect: true for matching answer', () => {
    const r = computeQuestionFeedback([0], [0], 'Great job!')
    expect(r).not.toBeNull()
    expect(r!.isCorrect).toBe(true)
    expect(r!.correctAnswer).toBe(0)
    expect(r!.explanation).toBe('Great job!')
  })

  it('should return isCorrect: false for non-matching answer', () => {
    const r = computeQuestionFeedback([0], [1])
    expect(r!.isCorrect).toBe(false)
  })

  it('should handle single number correctAnswer', () => {
    const r = computeQuestionFeedback(0, [0])
    expect(r!.isCorrect).toBe(true)
  })

  it('should handle multi-select correct answer', () => {
    const r = computeQuestionFeedback([0, 1], [0, 1])
    expect(r!.isCorrect).toBe(true)
    expect(r!.correctAnswers).toEqual([0, 1])
  })

  it('should normalize and sort answer indexes', () => {
    const r = computeQuestionFeedback([0, 1], [1, 0, 1])
    expect(r!.isCorrect).toBe(true)
  })

  it('should detect partial multi-select mismatch', () => {
    const r = computeQuestionFeedback([0, 1, 2], [0, 1])
    expect(r!.isCorrect).toBe(false)
  })
})
