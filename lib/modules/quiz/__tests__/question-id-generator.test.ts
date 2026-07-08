import { generateQuestionId, areQuestionsDuplicate, findDuplicateQuestions } from '../question-id-generator'

describe('generateQuestionId', () => {
  it('should generate consistent IDs for same content', () => {
    const id1 = generateQuestionId({ text: 'What is 2+2?', options: ['3', '4'], correct_answer: 1 })
    const id2 = generateQuestionId({ text: 'What is 2+2?', options: ['3', '4'], correct_answer: 1 })
    expect(id1).toBe(id2)
  })

  it('should generate same ID regardless of option order', () => {
    const id1 = generateQuestionId({ text: 'Test', options: ['A', 'B', 'C'] })
    const id2 = generateQuestionId({ text: 'Test', options: ['C', 'A', 'B'] })
    expect(id1).toBe(id2)
  })

  it('should generate different IDs for different questions', () => {
    const id1 = generateQuestionId({ text: 'Q1', options: ['A', 'B'] })
    const id2 = generateQuestionId({ text: 'Q2', options: ['A', 'B'] })
    expect(id1).not.toBe(id2)
  })

  it('should normalize text whitespace', () => {
    const id1 = generateQuestionId({ text: '  Hello   World  ', options: ['A'] })
    const id2 = generateQuestionId({ text: 'Hello World', options: ['A'] })
    expect(id1).toBe(id2)
  })
})

describe('areQuestionsDuplicate', () => {
  it('should return true for identical questions', () => {
    const q = { text: 'Q', options: ['A', 'B'], correct_answer: [0] as number | number[] }
    expect(areQuestionsDuplicate(q, q)).toBe(true)
  })
  it('should return false for different questions', () => {
    const q1 = { text: 'Q1', options: ['A', 'B'], correct_answer: [0] as number | number[] }
    const q2 = { text: 'Q2', options: ['A', 'B'], correct_answer: [0] as number | number[] }
    expect(areQuestionsDuplicate(q1, q2)).toBe(false)
  })
})

describe('findDuplicateQuestions', () => {
  it('should find duplicate questions by ID', () => {
    const questions = [
      { text: 'Q1', options: ['A', 'B'], correct_answer: [0] as number | number[] },
      { text: 'Q1', options: ['A', 'B'], correct_answer: [0] as number | number[] },
      { text: 'Q2', options: ['C'], correct_answer: [0] as number | number[] },
    ]
    const dups = findDuplicateQuestions(questions)
    expect(dups.size).toBe(1)
  })

  it('should return empty map for unique questions', () => {
    const questions = [
      { text: 'Q1', options: ['A'], correct_answer: [0] as number | number[] },
      { text: 'Q2', options: ['B'], correct_answer: [0] as number | number[] },
    ]
    expect(findDuplicateQuestions(questions).size).toBe(0)
  })
})
