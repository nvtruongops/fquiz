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
    handler(req, { payload: { userId: 'student-1', role: 'dev', v: 1 }, params: ctx?.params }),
}))

jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Question', () => ({
  Question: {
    find: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: '64a7ea5d737d0e002d33c94d',
              text: 'Team of 9 people, how many communication channels?',
              options: ['A. 8', 'B. 9', 'C. 28', 'D. 36'],
              correct_answer: [3],
              explanation: '9 * 8 / 2 = 36',
            },
          ]),
        }),
      }),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/core/di', () => ({
  container: {
    resolve: jest.fn(),
  },
}))

describe('POST /api/v1/ai/quiz-assistant - Dev Only Quiz Assistant Route', () => {
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

  it('should process user query with special characters safely without syntax error', async () => {
    const mockSession = {
      _id: 'session-123',
      student_id: 'student-1',
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
      }),
    }

    ;(container.resolve as jest.Mock).mockReturnValue(mockAiContentService)

    const req = new Request('http://localhost/api/v1/ai/quiz-assistant', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        questionIndex: 0,
        userQuery: 'Có câu nào tương tự nhưng là đáp án A không ? (special chars: *+?^$)',
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.reply).toContain('Phân tích')
  })
})
