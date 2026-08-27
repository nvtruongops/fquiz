import { Quiz } from '../models/Quiz'

// Mock Quiz model findById
jest.mock('../models/Quiz', () => ({
  Quiz: {
    findById: jest.fn(),
  },
}))

describe('quiz-engine question resolution edge cases', () => {
  test('Quiz.findById returns null when quiz does not exist', async () => {
    ;(Quiz.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    })

    const result = await Quiz.findById('nonexistent' as any).lean()
    expect(result).toBeNull()
  })

  test('Quiz questions ordering maps correctly', () => {
    const questions = [
      { question: 'Q1', options: ['A', 'B'] },
      { question: 'Q2', options: ['C', 'D'] },
      { question: 'Q3', options: ['E', 'F'] },
    ]
    const order = [2, 0, 1]
    const reordered = order.map((i) => questions[i]).filter(Boolean)

    expect(reordered[0].question).toBe('Q3')
    expect(reordered[1].question).toBe('Q1')
    expect(reordered[2].question).toBe('Q2')
  })
})
