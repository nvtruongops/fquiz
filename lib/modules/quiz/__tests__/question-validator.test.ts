/**
 * Unit tests for validateQuestion() — 100% coverage: valid, errors, warnings, edge cases
 */
import { validateQuestion, summarizeValidation } from '@/lib/modules/quiz/question-validator'

describe('validateQuestion', () => {
  it('valid single-answer', () => {
    const r = validateQuestion({ text: 'What is 2+2?', options: ['3','4','5'], correct_answer: 1 })
    expect(r.valid).toBe(true); expect(r.errors).toHaveLength(0)
  })
  it('valid multi-answer', () => {
    const r = validateQuestion({ text: 'Select evens', options: ['1','2','3','4'], correct_answer: [1,3] })
    expect(r.valid).toBe(true)
  })
  it('valid with single correct_answer in array', () => {
    expect(validateQuestion({ text: 'Test', options: ['A','B'], correct_answer: [0] }).valid).toBe(true)
  })

  describe('errors', () => {
    it('EMPTY_TEXT: empty', () => {
      expect(validateQuestion({ text: '', options: ['A','B'], correct_answer: 0 }).errors.some(e => e.code==='EMPTY_TEXT')).toBe(true)
    })
    it('EMPTY_TEXT: whitespace only', () => {
      expect(validateQuestion({ text: '   ', options: ['A','B'], correct_answer: 0 }).errors.some(e => e.code==='EMPTY_TEXT')).toBe(true)
    })
    it('EMPTY_OPTIONS', () => {
      expect(validateQuestion({ text: 'T', options: [], correct_answer: 0 }).errors.some(e => e.code==='EMPTY_OPTIONS')).toBe(true)
    })
    it('INSUFFICIENT_OPTIONS', () => {
      expect(validateQuestion({ text: 'T', options: ['Only'], correct_answer: 0 }).errors.some(e => e.code==='INSUFFICIENT_OPTIONS')).toBe(true)
    })
    it('EMPTY_OPTION', () => {
      expect(validateQuestion({ text: 'T', options: ['A','   ','C'], correct_answer: 0 }).errors.some(e => e.code==='EMPTY_OPTION')).toBe(true)
    })
    it('DUPLICATE_OPTIONS', () => {
      expect(validateQuestion({ text: 'T', options: ['Paris','PARIS'], correct_answer: 0 }).errors.some(e => e.code==='DUPLICATE_OPTIONS')).toBe(true)
    })
    it('MISSING_CORRECT_ANSWER', () => {
      expect(validateQuestion({ text: 'T', options: ['A','B'], correct_answer: [] }).errors.some(e => e.code==='MISSING_CORRECT_ANSWER')).toBe(true)
    })
    it('INVALID_INDEX: negative', () => {
      expect(validateQuestion({ text: 'T', options: ['A','B'], correct_answer: -1 }).errors.some(e => e.code==='INVALID_CORRECT_ANSWER_INDEX')).toBe(true)
    })
    it('INVALID_INDEX: out of bounds', () => {
      expect(validateQuestion({ text: 'T', options: ['A','B'], correct_answer: 5 }).errors.some(e => e.code==='INVALID_CORRECT_ANSWER_INDEX')).toBe(true)
    })
    it('multiple errors at once', () => {
      const r = validateQuestion({ text: '', options: ['A'], correct_answer: 5 })
      expect(r.valid).toBe(false); expect(r.errors.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('warnings', () => {
    it('short text', () => {
      expect(validateQuestion({ text: 'Hi', options: ['A','B'], correct_answer: 0 }).warnings.some(w => w.includes('short'))).toBe(true)
    })
    it('long option', () => {
      expect(validateQuestion({ text: 'Test', options: ['A','B'.repeat(501)], correct_answer: 0 }).warnings.some(w => w.includes('long'))).toBe(true)
    })
    it('multi-answer', () => {
      expect(validateQuestion({ text: 'Test', options: ['A','B','C','D'], correct_answer: [0,1,2] }).warnings.some(w => w.includes('Multi-answer'))).toBe(true)
    })
    it('no warnings for normal', () => {
      expect(validateQuestion({ text: 'Normal question', options: ['A','B','C'], correct_answer: 1 }).warnings).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('exactly 2 options', () => {
      expect(validateQuestion({ text: 'OK', options: ['A','B'], correct_answer: 0 }).valid).toBe(true)
    })
    it('last index answer', () => {
      expect(validateQuestion({ text: 'Q', options: ['A','B'], correct_answer: 1 }).valid).toBe(true)
    })
    it('multi-answer all valid indices', () => {
      expect(validateQuestion({ text: 'Q', options: ['A','B','C'], correct_answer: [0,2] }).valid).toBe(true)
    })
  })
})

describe('summarizeValidation', () => {
  it('all valid', () => {
    const r = summarizeValidation([{ text:'Q1',options:['A','B'],correct_answer:0 },{ text:'Q2',options:['A','B'],correct_answer:0 }])
    expect(r.total).toBe(2); expect(r.valid).toBe(2); expect(r.invalid).toBe(0)
  })
  it('mixed', () => {
    const r = summarizeValidation([
      { text:'V',options:['A','B'],correct_answer:0 },
      { text:'',options:['A','B'],correct_answer:0 },
      { text:'Q',options:['A'],correct_answer:0 },
      { text:'Q',options:['A','B'],correct_answer:0 },
    ])
    expect(r.valid).toBe(2); expect(r.invalid).toBe(2)
    expect(r.errorCounts['EMPTY_TEXT']).toBe(1)
    expect(r.errorCounts['INSUFFICIENT_OPTIONS']).toBe(1)
  })
  it('empty array', () => {
    const r = summarizeValidation([])
    expect(r.total).toBe(0); expect(r.valid).toBe(0); expect(r.invalid).toBe(0)
  })
})