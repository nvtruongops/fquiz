import { POST } from '../quiz-assistant/route'
import { container } from '@/lib/core/di'

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

jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Question', () => ({
  Question: {
    findById: jest.fn(),
    find: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'quiz-1',
          course_code: 'PMG201C',
          category_id: 'cat-1',
        }),
      }),
    }),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/QuestionBank', () => ({
  QuestionBank: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}))

jest.mock('@/lib/core/di', () => ({
  container: {
    resolve: jest.fn(),
  },
}))

describe('POST /api/v1/ai/quiz-assistant - Thin Controller & Orchestrator Integration', () => {
  const { QuizSession } = require('@/lib/modules/quiz/models/QuizSession')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if userQuery or sessionId is missing', async () => {
    const req = new Request('http://localhost/api/v1/ai/quiz-assistant', {
      method: 'POST',
      body: JSON.stringify({ sessionId: '', questionIndex: 0, userQuery: '' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('không hợp lệ')
  })

  it('should return 404 if session is not found', async () => {
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    })

    const req = new Request('http://localhost/api/v1/ai/quiz-assistant', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'invalid-id', questionIndex: 0, userQuery: 'Test query' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('Không tìm thấy phiên làm bài')
  })

  it('should return 403 if session belongs to different student_id than JWT payload', async () => {
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'session-123',
        student_id: 'other-student-id', // Does not match JWT 'student-1'
        quiz_id: 'quiz-1',
      }),
    })

    const req = new Request('http://localhost/api/v1/ai/quiz-assistant', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123', questionIndex: 0, userQuery: 'Test query' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('Forbidden')
  })

  it('should process user query with LLM and return structured QuizAssistantResponse', async () => {
    const mockSession = {
      _id: 'session-123',
      student_id: 'student-1',
      question_order: [0],
      questions_cache: [
        {
          _id: '64a7ea5d737d0e002d33c94e',
          text: 'Team of 8 people, how many communication channels?',
          options: ['A. 8', 'B. 9', 'C. 28', 'D. 36'],
          correct_answer: [2],
          explanation: '8 * 7 / 2 = 28',
        },
      ],
      user_answers: [{ question_index: 0, answer_index: 3, answer_indexes: [3] }],
    }

    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSession),
    })

    const mockAiContentService = {
      generate: jest.fn().mockResolvedValue({
        content: {
          reply: 'Phân tích phương án A vs C...',
          formulaExplanation: 'Công thức N*(N-1)/2',
          similarQuestionFound: false,
          similarQuestionDetails: null,
        },
        reused: false,
      }),
    }

    ;(container.resolve as jest.Mock).mockReturnValue(mockAiContentService)

    const req = new Request('http://localhost/api/v1/ai/quiz-assistant', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        questionIndex: 0,
        userQuery: 'Có câu nào tương tự nhưng là đáp án A không ?',
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.reply).toContain('Phân tích phương án')
    expect(res.body.data.responseMode).toBe('llm')
    expect(res.body.data.fallback).toBe(false)
    expect(Array.isArray(res.body.data.evidenceUsed)).toBe(true)
  })

  it('INVARIANT 5: should trigger Graceful DB Fallback when LLM provider throws or times out', async () => {
    const mockSession = {
      _id: 'session-123',
      student_id: 'student-1',
      question_order: [0],
      questions_cache: [
        {
          _id: '64a7ea5d737d0e002d33c94e',
          text: 'Team of 8 people, how many communication channels?',
          options: ['A. 8', 'B. 9', 'C. 28', 'D. 36'],
          correct_answer: [2],
          explanation: '8 * 7 / 2 = 28',
        },
      ],
      user_answers: [{ question_index: 0, answer_index: 3, answer_indexes: [3] }],
    }

    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSession),
    })

    const mockAiContentService = {
      generate: jest.fn().mockRejectedValue(new Error('Gemini API 503 Quota Exceeded')),
    }

    ;(container.resolve as jest.Mock).mockReturnValue(mockAiContentService)

    const req = new Request('http://localhost/api/v1/ai/quiz-assistant', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        questionIndex: 0,
        userQuery: 'Tại sao đáp án D sai?',
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.responseMode).toBe('db_fallback')
    expect(res.body.data.reply).toContain('Phân tích phương án bạn đã chọn')
  })
})
