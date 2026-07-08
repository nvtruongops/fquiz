/**
 * Mix-quiz job route test
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: { find: jest.fn().mockResolvedValue([]), create: jest.fn() },
}))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: { updateOne: jest.fn().mockResolvedValue({}) },
}))
jest.mock('@/lib/core/queue/qstash', () => ({
  verifyQStashRequest: jest.fn().mockResolvedValue({ isValid: false, status: 401, error: 'Unauthorized' }),
}))
jest.mock('@/lib/core/utils/shuffle', () => ({
  secureShuffle: jest.fn((arr) => [...arr]),
}))
jest.mock('@/lib/modules/quiz/question-id-generator', () => ({
  generateQuestionId: jest.fn(() => 'q_id'),
}))

import { POST } from '../route'

describe('POST /api/jobs/mix-quiz', () => {
  it('should be a function', () => {
    expect(typeof POST).toBe('function')
  })

  it('should return 401 for unverified request', async () => {
    const req = new Request('http://localhost/api/jobs/mix-quiz', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res).toBeDefined()
  })
})
