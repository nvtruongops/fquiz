import { GET } from '../[id]/questions/route'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionUsageService } from '@/lib/modules/quiz/services/question-usage.service'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}))

jest.mock('@/lib/modules/auth/auth', () => ({ verifyToken: jest.fn() }))
jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => (request: Request, context: any) =>
    handler(request, { ...context, payload: { userId: 'student-1', role: 'student' } }),
}))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: { findById: jest.fn(), updateOne: jest.fn() },
}))
jest.mock('@/lib/modules/quiz/services/question-usage.service', () => ({
  QuestionUsageService: { getBatchQuestionPublicUsage: jest.fn() },
}))
jest.mock('@/lib/modules/quiz/session-utils', () => ({
  ...jest.requireActual('@/lib/modules/quiz/session-utils'),
  validateQuizSessionRequest: jest.fn(),
}))

describe('GET /api/sessions/[id]/questions', () => {
  const question = {
    _id: 'question-1',
    question_id: 'question-id-1',
    text: 'Question?',
    options: ['First', 'Second'],
    correct_answer: 1,
  }

  const request = () => new Request('https://web.example.test/api/sessions/session-1/questions')
  const getQuestions = () => GET(request(), {
    params: Promise.resolve({ id: 'session-1' }),
  } as any)

  beforeEach(() => {
    jest.clearAllMocks()
    const query = {
      select: jest.fn(),
      lean: jest.fn().mockResolvedValue({ questions: [question], question_refs: [] }),
    }
    query.select.mockReturnValue(query)
    ;(Quiz.findById as jest.Mock).mockReturnValue(query)
    ;(QuestionUsageService.getBatchQuestionPublicUsage as jest.Mock).mockResolvedValue(
      new Map([['question-id-1', { count: 1, quizzes: ['COURSE-1'] }]])
    )
  })

  async function configureSession(mode: string, status: string) {
    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({
      isValid: true,
      session: {
        _id: 'session-1',
        quiz_id: 'quiz-1',
        mode,
        status,
        question_order: [0],
        questions_cache: [question],
        user_answers: [],
      },
    })
  }

  it.each(['immediate', 'review'])('skips usage lookup for an active %s assessment', async (mode) => {
    await configureSession(mode, 'active')

    const response = await getQuestions()

    expect(response.status).toBe(200)
    expect(QuestionUsageService.getBatchQuestionPublicUsage).not.toHaveBeenCalled()
    expect(response.body.questions[0]).toMatchObject({ usage_count: 0, used_in_quizzes: [] })
  })

  it('generates missing identity for a response without replacing the source quiz questions during GET', async () => {
    ;(Quiz.findById as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => ({ questions: [{ ...question, question_id: undefined }], question_refs: [] }) }) })
    ;(validateQuizSessionRequest as jest.Mock).mockResolvedValue({ isValid: true, session: {
      _id: 'session-1', quiz_id: 'quiz-1', mode: 'review', status: 'active', question_order: [0], user_answers: [],
    } })
    expect((await getQuestions()).status).toBe(200)
    expect(Quiz.updateOne).not.toHaveBeenCalled()
  })

  it.each([
    ['immediate', 'completed'],
    ['flashcard', 'active'],
  ])('keeps usage lookup for %s sessions with status %s', async (mode, status) => {
    await configureSession(mode, status)

    const response = await getQuestions()

    expect(response.status).toBe(200)
    expect(QuestionUsageService.getBatchQuestionPublicUsage).toHaveBeenCalledTimes(1)
    expect(response.body.questions[0]).toMatchObject({ usage_count: 1, used_in_quizzes: ['COURSE-1'] })
  })
})
