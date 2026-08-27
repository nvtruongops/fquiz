import { POST } from '../[id]/activity/route'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'

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

describe('POST /api/sessions/[id]/activity - Activity Tracking & State Invariants', () => {
  const mockParams = Promise.resolve({ id: 'session-123' })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not roll back current_question_index on pause event when body.current_question_index is smaller', async () => {
    const mockSession = {
      _id: 'session-123',
      status: 'active',
      current_question_index: 2,
    }

    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({
      isValid: true,
      session: mockSession,
    })

    const req = new Request('http://localhost/api/sessions/session-123/activity', {
      method: 'POST',
      body: JSON.stringify({ event: 'pause', current_question_index: 0 }),
    })

    const res = await POST(req, { params: mockParams })

    expect(res.status).toBe(200)
    expect(QuizSession.updateOne).toHaveBeenCalledWith(
      { _id: 'session-123' },
      expect.objectContaining({
        $set: expect.objectContaining({
          current_question_index: 2, // Math.max(2, 0) => 2, NOT 0
        }),
      })
    )
  })

  it('should update current_question_index on pause event when body.current_question_index is larger', async () => {
    const mockSession = {
      _id: 'session-123',
      status: 'active',
      current_question_index: 1,
    }

    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({
      isValid: true,
      session: mockSession,
    })

    const req = new Request('http://localhost/api/sessions/session-123/activity', {
      method: 'POST',
      body: JSON.stringify({ event: 'pause', current_question_index: 3 }),
    })

    const res = await POST(req, { params: mockParams })

    expect(res.status).toBe(200)
    expect(QuizSession.updateOne).toHaveBeenCalledWith(
      { _id: 'session-123' },
      expect.objectContaining({
        $set: expect.objectContaining({
          current_question_index: 3, // Math.max(1, 3) => 3
        }),
      })
    )
  })
})
