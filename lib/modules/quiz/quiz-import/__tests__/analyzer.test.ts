import { analyzeQuestionStructure } from '../analyzer'

describe('analyzeQuestionStructure', () => {
  it('should analyze standard questions (4 options, 1 correct answer)', () => {
    const questions = [
      { options: ['A', 'B', 'C', 'D'], correct_answer: [0] },
      { options: ['W', 'X', 'Y', 'Z'], correct_answer: [2] },
    ]

    const report = analyzeQuestionStructure(questions)
    expect(report.total).toBe(2)
    expect(report.standardCount).toBe(2)
    expect(report.nonStandardCount).toBe(0)
    expect(report.singleCorrectCount).toBe(2)
    expect(report.fourOptionsCount).toBe(2)
  })

  it('should detect non-standard option counts and multiple correct answers', () => {
    const questions = [
      { options: ['A', 'B', 'C', 'D'], correct_answer: [0] }, // Standard
      { options: ['A', 'B', 'C'], correct_answer: [0, 1] }, // 3 options, 2 correct
      { options: ['A', 'B', 'C', 'D', 'E'], correct_answer: [2] }, // 5 options, 1 correct
    ]

    const report = analyzeQuestionStructure(questions)
    expect(report.total).toBe(3)
    expect(report.standardCount).toBe(1)
    expect(report.nonStandardCount).toBe(2)

    expect(report.fourOptionsCount).toBe(1)
    expect(report.lessThanFourOptionsCount).toBe(1)
    expect(report.moreThanFourOptionsCount).toBe(1)

    expect(report.singleCorrectCount).toBe(2)
    expect(report.multiCorrectCount).toBe(1)
    expect(report.multiCorrectBreakdown[2]).toBe(1)

    expect(report.nonStandardQuestions.length).toBe(2)
    expect(report.nonStandardQuestions[0].questionIndex).toBe(1)
    expect(report.nonStandardQuestions[0].reasons).toContain('3 phương án (chuẩn là 4)')
    expect(report.nonStandardQuestions[0].reasons).toContain('2 đáp án đúng (chuẩn là 1)')
  })
})
