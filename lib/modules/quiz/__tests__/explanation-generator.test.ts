import { ensureExplanation } from '../explanation-generator'

describe('ensureExplanation', () => {
  it('preserves existing explanation if present and non-empty', () => {
    const result = ensureExplanation({
      text: '2 + 2 = ?',
      options: ['3', '4', '5'],
      correct_answer: [1],
      explanation: 'Giải thích có sẵn: 2 + 2 = 4',
    })
    expect(result).toBe('Giải thích có sẵn: 2 + 2 = 4')
  })

  it('generates single answer explanation when explanation is missing', () => {
    const result = ensureExplanation({
      text: '5 × 3 = ?',
      options: ['10', '15', '20'],
      correct_answer: 1,
    })
    expect(result).toContain('Đáp án đúng là "15"')
    expect(result).toContain('5 × 3 = ?')
  })

  it('generates multiple answers explanation when correct_answer has multiple indices', () => {
    const result = ensureExplanation({
      text: 'Các số nguyên tố nhỏ hơn 5?',
      options: ['2', '3', '4', '6'],
      correct_answer: [0, 1],
    })
    expect(result).toContain('Các đáp án đúng gồm: "2", "3"')
  })

  it('returns fallback explanation if options or correct_answer are missing', () => {
    const result = ensureExplanation({
      text: 'Câu hỏi không có lựa chọn',
    })
    expect(result).toBe('Đáp án đúng dựa trên nội dung câu hỏi.')
  })
})
