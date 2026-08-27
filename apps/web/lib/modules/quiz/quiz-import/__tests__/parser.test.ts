import { parseImportPayload } from '../parser'
import { normalizeImportedQuiz } from '../normalizer'

describe('parser', () => {
  it('should parse valid JSON', () => {
    const r = parseImportPayload(JSON.stringify({ quizMeta: { title: 'Q' }, questions: [] }))
    expect((r.quizMeta as any).title).toBe('Q')
  })
  it('should throw for bad JSON', () => {
    expect(() => parseImportPayload('garbage!')).toThrow('INVALID_JSON')
  })
  it('should parse object directly', () => {
    const r = parseImportPayload({ quizMeta: { course_code: 'CS' }, questions: [] })
    expect((r.quizMeta as any).course_code).toBe('CS')
  })
  it('should reject null/array', () => {
    expect(() => parseImportPayload(null)).toThrow('INVALID_PAYLOAD_SHAPE')
    expect(() => parseImportPayload([])).toThrow('INVALID_PAYLOAD_SHAPE')
  })
  it('should reject pure string input', () => {
    // A non-JSON, non-parseable string should throw
    expect(() => parseImportPayload('not json')).toThrow()
  })
  it('should correctly parse TXT with C++, A+, A-level without stripping characters', () => {
    const txt = `
môn học: CS101
fquiz code: CS101

Câu 1:
câu hỏi: Ngôn ngữ nào sau đây?
A. C++
B. A+ grade
C. A-level
D. A/B testing
đáp án: A
`
    const parsed = parseImportPayload(txt)
    const normalized = normalizeImportedQuiz(parsed)
    expect(normalized.questions.length).toBe(1)
    expect(normalized.questions[0].options).toEqual(['C++', 'A+ grade', 'A-level', 'A/B testing'])
    expect(normalized.questions[0].correct_answer).toEqual([0])
  })
})