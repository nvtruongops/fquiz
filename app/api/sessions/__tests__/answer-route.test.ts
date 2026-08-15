import { POST } from '../[id]/answer/route'
import { processImmediateAnswer, processReviewAnswer, getImmediateAnswerResult } from '@/lib/modules/quiz/quiz-engine'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'

// Mock dependencies
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}))

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx?: any) =>
    handler(req, { payload: { userId: 'student-1', role: 'student', v: 1 }, params: ctx?.params }),
}))

jest.mock('@/lib/modules/quiz/session-utils', () => ({
  validateQuizSessionRequest: jest.fn(),
}))

jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}))

jest.mock('@/lib/modules/quiz/quiz-engine', () => ({
  processImmediateAnswer: jest.fn(),
  processReviewAnswer: jest.fn(),
  getImmediateAnswerResult: jest.fn(),
}))

describe('POST /api/sessions/[id]/answer - State Machine & Security Tests', () => {
  const mockParams = Promise.resolve({ id: 'session-123' })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if question_index is out of bounds (greater than question count)', async () => {
    const mockSession = {
      _id: 'session-123',
      status: 'active',
      mode: 'immediate',
      current_question_index: 0,
      question_count: 5,
      question_order: [0, 1, 2, 3, 4],
      user_answers: [],
    }

    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({
      isValid: true,
      session: mockSession,
    })

    const req = new Request('http://localhost/api/sessions/session-123/answer', {
      method: 'POST',
      body: JSON.stringify({ question_index: 99, answer_index: 0 }),
    })

    const res = await POST(req, { params: mockParams })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('out of bounds')
  })

  it('should return read-only cached result without calling processImmediateAnswer or updating DB when question is already answered', async () => {
    const { QuizSession } = require('@/lib/modules/quiz/models/QuizSession')
    const mockSession = {
      _id: 'session-123',
      status: 'active',
      mode: 'immediate',
      current_question_index: 2,
      question_count: 4,
      question_order: [0, 1, 2, 3],
      user_answers: [
        { question_index: 0, answer_index: 0, is_correct: true },
        { question_index: 1, answer_index: 1, is_correct: false },
      ],
    }

    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({
      isValid: true,
      session: mockSession,
    })

    ;(getImmediateAnswerResult as jest.Mock).mockResolvedValue({
      isCorrect: true,
      correctAnswer: 0,
      explanation: 'Test explanation',
    })

    const req = new Request('http://localhost/api/sessions/session-123/answer', {
      method: 'POST',
      body: JSON.stringify({ question_index: 0, answer_index: 0 }),
    })

    const res = await POST(req, { params: mockParams })

    expect(res.status).toBe(200)
    expect(getImmediateAnswerResult).toHaveBeenCalledWith(mockSession, 0)
    expect(processImmediateAnswer).not.toHaveBeenCalled()
    expect(QuizSession.updateOne).not.toHaveBeenCalled()
  })

  it('should allow answering an out-of-order unanswered question in immediate mode', async () => {
    const mockSession = {
      _id: 'session-123',
      status: 'active',
      mode: 'immediate',
      current_question_index: 1,
      question_count: 4,
      question_order: [0, 1, 2, 3],
      user_answers: [
        { question_index: 0, answer_index: 0, is_correct: true },
      ],
    }

    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({
      isValid: true,
      session: mockSession,
    })

    ;(processImmediateAnswer as jest.Mock).mockResolvedValue({
      isCorrect: true,
      correctAnswer: 0,
      explanation: 'Explanation for Q3',
    })

    const req = new Request('http://localhost/api/sessions/session-123/answer', {
      method: 'POST',
      body: JSON.stringify({ question_index: 3, answer_index: 0 }),
    })

    const res = await POST(req, { params: mockParams })

    expect(res.status).toBe(200)
    expect(processImmediateAnswer).toHaveBeenCalledWith(mockSession, [0], 3)
  })

  it('should process a valid answer for current question in immediate mode', async () => {
    const mockSession = {
      _id: 'session-123',
      status: 'active',
      mode: 'immediate',
      current_question_index: 1,
      question_count: 4,
      question_order: [0, 1, 2, 3],
      user_answers: [{ question_index: 0, answer_index: 0, is_correct: true }],
    }

    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({
      isValid: true,
      session: mockSession,
    })

    ;(processImmediateAnswer as jest.Mock).mockResolvedValue({
      isCorrect: true,
      correctAnswer: 1,
      explanation: 'Correct',
    })

    const req = new Request('http://localhost/api/sessions/session-123/answer', {
      method: 'POST',
      body: JSON.stringify({ question_index: 1, answer_index: 1 }),
    })

    const res = await POST(req, { params: mockParams })

    expect(res.status).toBe(200)
    expect(processImmediateAnswer).toHaveBeenCalledWith(mockSession, [1], 1)
  })
})
