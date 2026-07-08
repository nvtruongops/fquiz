import { analyzeQuizCompleteness } from '../quiz-analyzer'

describe('analyzeQuizCompleteness', () => {
  it('should flag missing category', () => {
    const result = analyzeQuizCompleteness({ questions: [] }, 0)
    expect(result.errors.some(e => e.code === 'MISSING_CATEGORY')).toBe(true)
  })

  it('should flag missing course_code', () => {
    const result = analyzeQuizCompleteness({ questions: [] }, 0)
    expect(result.errors.some(e => e.code === 'MISSING_COURSE_CODE')).toBe(true)
  })

  it('should flag invalid course_code', () => {
    const result = analyzeQuizCompleteness({ course_code: '!!invalid!!', questions: [] }, 0)
    expect(result.errors.some(e => e.code === 'INVALID_COURSE_CODE')).toBe(true)
  })

  it('should accept valid quiz with all fields', () => {
    const data = {
      category_id: 'cat-1',
      course_code: 'MATH101',
      questions: [
        { text: 'Q1', options: ['A', 'B'], correct_answer: [0] },
      ],
    }
    const result = analyzeQuizCompleteness(data, 1)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should flag missing text', () => {
    const data = {
      category_id: 'cat-1',
      course_code: 'MATH101',
      questions: [
        { text: '', options: ['A', 'B'], correct_answer: [0] },
      ],
    }
    const result = analyzeQuizCompleteness(data, 1)
    expect(result.errors.some(e => e.code === 'MISSING_TEXT')).toBe(true)
    expect(result.summary.missingTextCount).toBe(1)
  })

  it('should flag no correct answer', () => {
    const data = {
      category_id: 'cat-1',
      course_code: 'MATH101',
      questions: [
        { text: 'Q1', options: ['A', 'B'] },
      ],
    }
    const result = analyzeQuizCompleteness(data, 1)
    expect(result.errors.some(e => e.code === 'NO_CORRECT_ANSWER')).toBe(true)
  })

  it('should flag empty option gaps', () => {
    const data = {
      category_id: 'cat-1',
      course_code: 'MATH101',
      questions: [
        { text: 'Q1', options: ['A', '', 'B'], correct_answer: [0] },
      ],
    }
    const result = analyzeQuizCompleteness(data, 1)
    expect(result.errors.some(e => e.code === 'EMPTY_OPTION')).toBe(true)
  })

  it('should flag target mismatch (too few questions)', () => {
    const data = {
      category_id: 'cat-1',
      course_code: 'MATH101',
      questions: [{ text: 'Q1', options: ['A'], correct_answer: [0] }],
    }
    const result = analyzeQuizCompleteness(data, 5)
    expect(result.errors.some(e => e.code === 'TARGET_MISMATCH')).toBe(true)
  })

  it('should warn about exceeding target', () => {
    const data = {
      category_id: 'cat-1',
      course_code: 'MATH101',
      questions: [
        { text: 'Q1', options: ['A'], correct_answer: [0] },
        { text: 'Q2', options: ['A'], correct_answer: [0] },
        { text: 'Q3', options: ['A'], correct_answer: [0] },
      ],
    }
    const result = analyzeQuizCompleteness(data, 2)
    expect(result.warnings.some(w => w.code === 'TARGET_MISMATCH')).toBe(true)
  })

  it('should calculate progress correctly', () => {
    const data = {
      category_id: 'cat-1',
      course_code: 'MATH101',
      questions: [
        { text: 'Q1', options: ['A'], correct_answer: [0] },
        { text: '', options: ['A'], correct_answer: [0] },
      ],
    }
    const result = analyzeQuizCompleteness(data, 2)
    expect(result.progressPercent).toBe(50)
    expect(result.summary.completedQuestions).toBe(1)
    expect(result.summary.totalQuestions).toBe(2)
  })

  it('should return 100 progress for empty quiz with target 0', () => {
    const result = analyzeQuizCompleteness({ questions: [] }, 0)
    expect(result.progressPercent).toBe(0)
  })

  it('should accept course_code at max length', () => {
    const data = {
      category_id: 'cat-1',
      course_code: 'A'.repeat(20),
      questions: [],
    }
    const result = analyzeQuizCompleteness(data, 0)
    expect(result.errors.some(e => e.code === 'INVALID_COURSE_CODE')).toBe(false)
  })
})
