import { POST } from './route'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
  requireRole: jest.fn(),
}))
jest.mock('@/lib/mongodb', () => ({
  connectDB: jest.fn(),
}))
jest.mock('@/models/Category', () => ({
  Category: { findOne: jest.fn() },
}))

const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>
const mockedConnectDB = connectDB as jest.MockedFunction<typeof connectDB>
const mockedCategoryFindOne = Category.findOne as jest.Mock

describe('/api/import/quiz/preview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    mockedConnectDB.mockResolvedValue(undefined as any)
    mockedCategoryFindOne.mockImplementation(() => ({
      select: () => ({
        lean: async () => ({ _id: 'mock-category-id' }),
      }),
    }))
  })

  it('returns 401 when auth fails', async () => {
    mockedVerifyToken.mockResolvedValueOnce(null)
    const req = new Request('http://localhost/api/import/quiz/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 413 when file exceeds max size', async () => {
    mockedVerifyToken.mockResolvedValueOnce({ userId: 'u1', role: 'student' })

    const largeText = 'a'.repeat(2 * 1024 * 1024 + 10)
    const form = new FormData()
    form.append('file', new File([largeText], 'quiz.json', { type: 'application/json' }))

    const req = new Request('http://localhost/api/import/quiz/preview', {
      method: 'POST',
      body: form,
    })

    const res = await POST(req)
    expect(res.status).toBe(413)
  })

  it('returns 400 for invalid JSON in txt file', async () => {
    mockedVerifyToken.mockResolvedValueOnce({ userId: 'u1', role: 'admin' })

    const form = new FormData()
    form.append('file', new File(['not-json'], 'quiz.txt', { type: 'text/plain' }))
    const req = new Request('http://localhost/api/import/quiz/preview', {
      method: 'POST',
      body: form,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('JSON')
  })

  it('returns preview for valid payload', async () => {
    mockedVerifyToken.mockResolvedValueOnce({ userId: 'u1', role: 'student' })

    const body = JSON.stringify({
      quizMeta: { course_code: 'de-10', title: 'De 10' },
      questions: [
        {
          text: 'Q1',
          options: ['A', 'B'],
          correct_answer: [0],
        },
      ],
    })

    const req = new Request('http://localhost/api/import/quiz/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.isValid).toBe(true)
    expect(data.normalizedQuiz.course_code).toBe('DE-10')
  })

  it('accepts valid txt file content', async () => {
    mockedVerifyToken.mockResolvedValueOnce({ userId: 'u1', role: 'student' })

    const txt = JSON.stringify({
      quizMeta: { course_code: 'txt-01' },
      questions: [
        {
          text: 'Q1',
          options: ['A', 'B'],
          correct_answer: [0],
        },
      ],
    })
    const form = new FormData()
    form.append('file', new File([txt], 'quiz.txt', { type: 'text/plain' }))

    const req = new Request('http://localhost/api/import/quiz/preview', {
      method: 'POST',
      body: form,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.isValid).toBe(true)
    expect(data.normalizedQuiz.course_code).toBe('TXT-01')
  })

  it('returns CATEGORY_NOT_FOUND when category token is unavailable', async () => {
    mockedVerifyToken.mockResolvedValueOnce({ userId: 'u1', role: 'student' })
    mockedCategoryFindOne.mockImplementationOnce(() => ({
      select: () => ({
        lean: async () => null,
      }),
    }))

    const body = JSON.stringify({
      quizMeta: { category_id: 'frs401c', course_code: 'de-20' },
      questions: [
        {
          question: 'Q1',
          options: ['[A]"1"', '[B]"2"'],
          correct_answer: ['B'],
        },
      ],
    })

    const req = new Request('http://localhost/api/import/quiz/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.isValid).toBe(false)
    expect(data.diagnostics.some((item: any) => item.code === 'CATEGORY_NOT_FOUND')).toBe(true)
  })
})
