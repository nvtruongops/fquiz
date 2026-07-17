/**
 * Unit tests for generateQuestionFingerprint() - 100% coverage
 */
import { generateQuestionFingerprint } from '@/lib/modules/quiz/question-id-generator'

describe('generateQuestionFingerprint', () => {
  describe('identity', () => {
    it('same question same fp', () => {
      const a = generateQuestionFingerprint({ text:'Q',options:['A','B'],correct_answer:0 })
      const b = generateQuestionFingerprint({ text:'Q',options:['A','B'],correct_answer:0 })
      expect(a).toBe(b)
    })
    it('option reorder with adjusted index = different (indices hashed)', () => {
      const a = generateQuestionFingerprint({ text:'C?',options:['P','L'],correct_answer:0 })
      const b = generateQuestionFingerprint({ text:'C?',options:['L','P'],correct_answer:1 })
      expect(a).not.toBe(b)
    })
    it('single vs array answer same', () => {
      expect(generateQuestionFingerprint({ text:'X',options:['1','2'],correct_answer:1 }))
        .toBe(generateQuestionFingerprint({ text:'X',options:['1','2'],correct_answer:[1] }))
    })
    it('sorts multi-answer', () => {
      expect(generateQuestionFingerprint({ text:'E',options:['1','2','3','4'],correct_answer:[3,1] }))
        .toBe(generateQuestionFingerprint({ text:'E',options:['1','2','3','4'],correct_answer:[1,3] }))
    })
  })
  describe('differentiation', () => {
    it('diff answer', () => {
      expect(generateQuestionFingerprint({ text:'H',options:['A','B'],correct_answer:0 }))
        .not.toBe(generateQuestionFingerprint({ text:'H',options:['A','B'],correct_answer:1 }))
    })
    it('diff lang', () => {
      expect(generateQuestionFingerprint({ text:'H',options:['A','B'],correct_answer:0,language:'en' }))
        .not.toBe(generateQuestionFingerprint({ text:'H',options:['A','B'],correct_answer:0,language:'vi' }))
    })
    it('diff type', () => {
      expect(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0,question_type:'single_choice' }))
        .not.toBe(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0,question_type:'multiple_choice' }))
    })
    it('diff topic', () => {
      expect(generateQuestionFingerprint({ text:'G',options:['X','Y'],correct_answer:0,topic:'tenses' }))
        .not.toBe(generateQuestionFingerprint({ text:'G',options:['X','Y'],correct_answer:0,topic:'articles' }))
    })
    it('diff options', () => {
      expect(generateQuestionFingerprint({ text:'C',options:['R','B'],correct_answer:0 }))
        .not.toBe(generateQuestionFingerprint({ text:'C',options:['R','G'],correct_answer:0 }))
    })
  })
  describe('normalization', () => {
    it('trim text', () => {
      expect(generateQuestionFingerprint({ text:'  Hi  ',options:['A','B'],correct_answer:0 }))
        .toBe(generateQuestionFingerprint({ text:'Hi',options:['A','B'],correct_answer:0 }))
    })
    it('collapse spaces', () => {
      expect(generateQuestionFingerprint({ text:'A   B',options:['1','2'],correct_answer:0 }))
        .toBe(generateQuestionFingerprint({ text:'A B',options:['1','2'],correct_answer:0 }))
    })
    it('case insensitive', () => {
      expect(generateQuestionFingerprint({ text:'HELLO',options:['a','b'],correct_answer:0 }))
        .toBe(generateQuestionFingerprint({ text:'hello',options:['A','B'],correct_answer:0 }))
    })
    it('trim options', () => {
      expect(generateQuestionFingerprint({ text:'X',options:[' A ',' B '],correct_answer:0 }))
        .toBe(generateQuestionFingerprint({ text:'X',options:['A','B'],correct_answer:0 }))
    })
  })
  describe('defaults', () => {
    it('lang unknown', () => {
      expect(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0 }))
        .toBe(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0,language:'unknown' }))
    })
    it('type single_choice', () => {
      expect(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0 }))
        .toBe(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0,question_type:'single_choice' }))
    })
    it('topic empty', () => {
      expect(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0 }))
        .toBe(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0,topic:'' }))
    })
  })
  describe('format', () => {
    it('starts fp_', () => expect(generateQuestionFingerprint({ text:'Q',options:['A','B'],correct_answer:0 })).toMatch(/^fp_/))
    it('23 chars', () => expect(generateQuestionFingerprint({ text:'T',options:['A','B','C'],correct_answer:[0,1] })).toHaveLength(23))
    it('hex only', () => expect(generateQuestionFingerprint({ text:'T',options:['A','B'],correct_answer:0 }).slice(3)).toMatch(/^[a-f0-9]+$/))
  })
  describe('edge cases', () => {
    it('1-char', () => expect(generateQuestionFingerprint({ text:'X',options:['1','2'],correct_answer:0 })).toMatch(/^fp_/))
    it('10k text', () => expect(generateQuestionFingerprint({ text:'A'.repeat(10000),options:['1','2'],correct_answer:0 })).toMatch(/^fp_/))
    it('unicode', () => expect(generateQuestionFingerprint({ text:'nihao',options:['A','B'],correct_answer:0,language:'ja' })).toMatch(/^fp_/))
    it('special chars', () => expect(generateQuestionFingerprint({ text:'S',options:['<sc>','"q"','x'],correct_answer:0 })).toMatch(/^fp_/))
    it('25 opts', () => expect(generateQuestionFingerprint({ text:'M',options:Array.from({length:25},(_,i)=>'O'+i),correct_answer:0 })).toMatch(/^fp_/))
    it('deterministic', () => {
      const a=generateQuestionFingerprint({ text:'ABC',options:['1','2','3'],correct_answer:[0,2] })
      const b=generateQuestionFingerprint({ text:'ABC',options:['1','2','3'],correct_answer:[0,2] })
      expect(a).toBe(b)
    })
  })
})
