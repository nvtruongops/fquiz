import { POST } from '../[id]/answer/route'
import { processImmediateAnswer, processReviewAnswer, getImmediateAnswerResult } from '@/lib/modules/quiz/quiz-engine'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'

// Mock dependencies
jest.mock('next/server', () => ({
  NextResponse: class MockNextResponse {
    constructor(public body: any, public status: number, public headers: Headers) {}
    static json(body: any, init?: { status?: number; headers?: HeadersInit }) {
      return new MockNextResponse(body, init?.status ?? 200, new Headers(init?.headers))
    }
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
  ...jest.requireActual('@/lib/modules/quiz/session-utils'),
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

  it('accepts explicit empty review array over stale scalar and rejects missing answers', async () => {
    const session = { _id: 'session-123', status: 'active', mode: 'review', question_count: 1, current_question_index: 0 }
    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({ isValid: true, session })
    ;(processReviewAnswer as jest.Mock).mockResolvedValue({ answerIndexes: [] })
    const request = (body: any) => new Request('https://web.example.test/api/sessions/session-123/answer', {
      method: 'POST', body: JSON.stringify(body),
    })
    expect((await POST(request({ answer_indexes: [], answer_index: 1 }), { params: mockParams })).status).toBe(200)
    expect(processReviewAnswer).toHaveBeenCalledWith(session, [], 0)
    expect((await POST(request({}), { params: mockParams })).status).toBe(400)
  })

  it('passes safe intent revisions through and rejects unsafe revisions before persistence', async () => {
    const session = { _id: 'session-123', status: 'active', mode: 'review', question_count: 1, current_question_index: 0 }
    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({ isValid: true, session })
    ;(processReviewAnswer as jest.Mock).mockResolvedValue({ answerIndexes: [], answerRevision: 2 })
    const request = (revision: number) => new Request('https://web.example.test/api/sessions/session-123/answer', {
      method: 'POST', body: JSON.stringify({ answer_indexes: [], answer_revision: revision }),
    })
    expect((await POST(request(2), { params: mockParams })).status).toBe(200)
    expect(processReviewAnswer).toHaveBeenCalledWith(session, [], 0, 2)
    ;(processReviewAnswer as jest.Mock).mockClear()
    for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect((await POST(request(revision), { params: mockParams })).status).toBe(400)
    }
    expect(processReviewAnswer).not.toHaveBeenCalled()
  })

  it('rejects empty immediate submissions without grading or clearing', async () => {
    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({ isValid: true, session: {
      _id: 'session-123', status: 'active', mode: 'immediate', question_count: 1, current_question_index: 0,
    } })
    const req = new Request('https://web.example.test/api/sessions/session-123/answer', {
      method: 'POST', body: JSON.stringify({ answer_indexes: [] }),
    })
    expect((await POST(req, { params: mockParams })).status).toBe(400)
    expect(processImmediateAnswer).not.toHaveBeenCalled()
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

    const req = new Request('https://web.example.test/api/sessions/session-123/answer', {
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

    const req = new Request('https://web.example.test/api/sessions/session-123/answer', {
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

    const req = new Request('https://web.example.test/api/sessions/session-123/answer', {
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

    const req = new Request('https://web.example.test/api/sessions/session-123/answer', {
      method: 'POST',
      body: JSON.stringify({ question_index: 1, answer_index: 1 }),
    })

    const res = await POST(req, { params: mockParams })

    expect(res.status).toBe(200)
    expect(processImmediateAnswer).toHaveBeenCalledWith(mockSession, [1], 1)
    expect(res.headers.get('Server-Timing')).toContain('session;dur=')
    expect(res.headers.get('Server-Timing')).toContain('answer;dur=')
  })
})
