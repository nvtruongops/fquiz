import { parseImportPayload } from '../parser'

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
})