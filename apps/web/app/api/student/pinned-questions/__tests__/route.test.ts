/**
 * Unit tests for GET, POST, DELETE /api/student/pinned-questions
 */

import { GET, POST, DELETE } from '../route'
import { Types } from 'mongoose'

jest.mock('next/server', () => {
  class MockNextResponse {
    body: any
    status: number
    constructor(body: any, init?: any) {
      this.body = body
      this.status = init?.status ?? 200
    }
    static json(body: any, init?: any) {
      return new MockNextResponse(body, init)
    }
  }
  return { NextResponse: MockNextResponse }
})

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/modules/auth/auth', () => ({
  verifyToken: jest.fn().mockResolvedValue({ userId: '507f1f77bcf86cd799439011', role: 'student' }),
}))

jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx?: any) =>
    handler(req, {
      payload: { userId: '507f1f77bcf86cd799439011', role: 'student', v: 1 },
      params: ctx?.params,
    }),
}))

const mockPinnedFind = jest.fn()
const mockPinnedFindOne = jest.fn()
const mockPinnedCreate = jest.fn()
const mockPinnedDeleteOne = jest.fn()
const mockPinnedDeleteMany = jest.fn()

function makePinnedQuery(value: any) {
  const query: any = {
    sort: jest.fn(),
    limit: jest.fn(),
    select: jest.fn(),
    lean: jest.fn().mockResolvedValue(value),
  }
  query.sort.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  query.select.mockReturnValue(query)
  return query
}

jest.mock('@/lib/modules/quiz/models/PinnedQuestion', () => ({
  PinnedQuestion: {
    find: (...args: any[]) => mockPinnedFind(...args),
    findOne: (...args: any[]) => mockPinnedFindOne(...args),
    create: (...args: any[]) => mockPinnedCreate(...args),
    deleteOne: (...args: any[]) => mockPinnedDeleteOne(...args),
    deleteMany: (...args: any[]) => mockPinnedDeleteMany(...args),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    distinct: jest.fn(),
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    find: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
    exists: jest.fn().mockResolvedValue(null),
  },
}))

jest.mock('@/lib/modules/quiz/models/Question', () => ({
  Question: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/Category', () => ({
  Category: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
  },
}))

describe('GET, POST, DELETE /api/student/pinned-questions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return list of pinned questions', async () => {
      const quizId = new Types.ObjectId('507f1f77bcf86cd799439016')
      mockPinnedFind
        .mockReturnValueOnce(makePinnedQuery([{
          _id: new Types.ObjectId('507f1f77bcf86cd799439001'),
          quiz_id: quizId,
        }]))
        .mockReturnValueOnce(makePinnedQuery([
          { _id: new Types.ObjectId('507f1f77bcf86cd799439001'), quiz_id: quizId, text: 'Q1', course_code: 'PRN211' },
        ]))
      const { Quiz } = require('@/lib/modules/quiz/models/Quiz')
      Quiz.find.mockReturnValueOnce({ select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: quizId }]),
      }) })

      const req = new Request('https://web.example.test/api/student/pinned-questions?course_code=PRN211')
      const res = (await GET(req, {} as any)) as any
      const { QuizSession } = require('@/lib/modules/quiz/models/QuizSession')

      expect(res.status).toBe(200)
      expect(res.body.pinnedQuestions).toHaveLength(1)
      expect(res.body.nextCursor).toBeNull()
      expect(mockPinnedFind.mock.results[0].value.limit).toHaveBeenCalledWith(51)
      expect(QuizSession.find.mock.calls[0][0].$or).toEqual(expect.arrayContaining([
        { expires_at: { $exists: false } },
        { expires_at: null },
        { expires_at: { $gt: expect.any(Date) } },
      ]))
    })

    it('omits a pin whose quiz is private and owned by another user', async () => {
      mockPinnedFind.mockReturnValueOnce(makePinnedQuery([
        { _id: new Types.ObjectId('507f1f77bcf86cd799439001'), quiz_id: new Types.ObjectId('507f1f77bcf86cd799439016'), created_at: new Date() },
      ]))
      const { Quiz } = require('@/lib/modules/quiz/models/Quiz')
      Quiz.find.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) })

      const response = await GET(new Request('http://localhost:3000/api/student/pinned-questions'), {} as any) as any

      expect(response.body.pinnedQuestions).toEqual([])
    })

    it('returns a cursor when another bounded page is available', async () => {
      const page = Array.from({ length: 51 }, (_, index) => ({
        _id: new Types.ObjectId(`507f1f77bcf86cd7994390${String(index).padStart(2, '0')}`),
        quiz_id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      }))
      mockPinnedFind.mockReturnValueOnce(makePinnedQuery(page))
      const { Quiz } = require('@/lib/modules/quiz/models/Quiz')
      Quiz.find.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) })

      const response = await GET(new Request('http://localhost:3000/api/student/pinned-questions'), {} as any) as any

      expect(response.body.pinnedQuestions).toEqual([])
      expect(response.body.nextCursor).toBe(page[49]._id.toString())
      expect(mockPinnedFind.mock.results[0].value.limit).toHaveBeenCalledWith(51)
    })

    it('rejects an invalid pagination cursor', async () => {
      const response = await GET(new Request('http://localhost:3000/api/student/pinned-questions?cursor=bad|cursor'), {} as any) as any

      expect(response.status).toBe(400)
      expect(mockPinnedFind).not.toHaveBeenCalled()
    })

    it('uses a bounded category join instead of loading every quiz in the category', async () => {
      const categoryId = new Types.ObjectId('507f1f77bcf86cd799439098')
      const quizId = new Types.ObjectId('507f1f77bcf86cd799439099')
      const pinId = new Types.ObjectId('507f1f77bcf86cd799439097')
      const { Category } = require('@/lib/modules/quiz/models/Category')
      const { Quiz } = require('@/lib/modules/quiz/models/Quiz')
      Category.findOne.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: categoryId }) }),
      })
      mockPinnedFind
        .mockReturnValueOnce(makePinnedQuery([{ _id: pinId, quiz_id: quizId, course_code: 'BIO101' }]))
        .mockReturnValueOnce(makePinnedQuery([{ _id: pinId, quiz_id: quizId, text: 'Q1' }]))
      Quiz.find
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: quizId }]) }) }) })
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: quizId }]) }) })
      Quiz.distinct.mockResolvedValueOnce(['BIO101'])

      const response = await GET(new Request('http://localhost:3000/api/student/pinned-questions?course_code=Biology'), {} as any) as any

      expect(response.status).toBe(200)
      expect(response.body.pinnedQuestions).toHaveLength(1)
      expect(mockPinnedFind.mock.results[0].value.limit).toHaveBeenCalledWith(250)
      expect(Quiz.distinct).toHaveBeenCalledWith('course_code', {
        category_id: categoryId,
        course_code: { $in: ['BIO101'] },
      })
      expect(Quiz.find).not.toHaveBeenCalledWith({ category_id: categoryId })
    })
  })

  describe('POST', () => {
    it('does not unpin another option variant based on prompt text alone', async () => {
      mockPinnedFindOne.mockResolvedValueOnce(null)
      mockPinnedCreate.mockResolvedValueOnce({ _id: 'new-pin' })
      await POST(new Request('http://example.test/api/student/pinned-questions', { method: 'POST', body: JSON.stringify({ text: 'Same prompt', options: ['Apple', 'Berry'] }) }), {} as any)
      const filter = mockPinnedFindOne.mock.calls[0][0]
      expect(filter.$or).not.toContainEqual({ text: 'Same prompt' })
      expect(mockPinnedCreate.mock.calls[0][0].question_id).toMatch(/^q_[a-f0-9]{16}$/)
    })
    it('should return 400 if text is missing', async () => {
      const req = new Request('https://web.example.test/api/student/pinned-questions', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const res = (await POST(req, {} as any)) as any
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Question content is required.')
    })

    it('should unpin question if already exists', async () => {
      mockPinnedFindOne.mockResolvedValueOnce({
        _id: new Types.ObjectId('507f1f77bcf86cd799439001'),
      })
      mockPinnedDeleteOne.mockResolvedValueOnce({ deletedCount: 1 })

      const req = new Request('https://web.example.test/api/student/pinned-questions', {
        method: 'POST',
        body: JSON.stringify({ text: 'Question text', course_code: 'PRN211', options: ['A', 'B'] }),
      })
      const res = (await POST(req, {} as any)) as any

      expect(res.status).toBe(200)
      expect(res.body.pinned).toBe(false)
      expect(mockPinnedDeleteOne).toHaveBeenCalled()
    })

    it('should pin question if not already pinned', async () => {
      mockPinnedFindOne.mockResolvedValueOnce(null)
      mockPinnedCreate.mockResolvedValueOnce({
        _id: new Types.ObjectId('507f1f77bcf86cd799439001'),
        text: 'Question text',
        course_code: 'PRN211',
      })

      const req = new Request('https://web.example.test/api/student/pinned-questions', {
        method: 'POST',
        body: JSON.stringify({ text: 'Question text', course_code: 'PRN211', options: ['A', 'B'] }),
      })
      const res = (await POST(req, {} as any)) as any

      expect(res.status).toBe(201)
      expect(res.body.pinned).toBe(true)
      expect(mockPinnedCreate).toHaveBeenCalled()
    })

    it('rejects a pin request naming a foreign private quiz', async () => {
      const req = new Request('http://localhost:3000/api/student/pinned-questions', {
        method: 'POST',
        body: JSON.stringify({ quiz_id: '507f1f77bcf86cd799439016', text: 'Private question', options: ['A', 'B'] }),
      })
      const res = await POST(req, {} as any) as any
      expect(res.status).toBe(404)
      expect(mockPinnedCreate).not.toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    it('should delete all pinned questions matching filter', async () => {
      mockPinnedDeleteMany.mockResolvedValueOnce({ deletedCount: 5 })

      const req = new Request('https://web.example.test/api/student/pinned-questions?course_code=PRN211', {
        method: 'DELETE',
      })
      const res = (await DELETE(req, {} as any)) as any

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.deletedCount).toBe(5)
    })

    it('clears category pins in bounded batches', async () => {
      const categoryId = new Types.ObjectId('507f1f77bcf86cd799439098')
      const pinId = new Types.ObjectId('507f1f77bcf86cd799439097')
      const { Category } = require('@/lib/modules/quiz/models/Category')
      const { Quiz } = require('@/lib/modules/quiz/models/Quiz')
      Category.findOne.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: categoryId }) }),
      })
      mockPinnedFind.mockReturnValueOnce(makePinnedQuery([{ _id: pinId, quiz_id: new Types.ObjectId('507f1f77bcf86cd799439099'), course_code: 'BIO101' }]))
      Quiz.distinct.mockResolvedValueOnce(['BIO101'])
      Quiz.find.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId('507f1f77bcf86cd799439099') }]) }) }) })
      mockPinnedDeleteMany.mockResolvedValueOnce({ deletedCount: 1 })

      const response = await DELETE(new Request('http://localhost:3000/api/student/pinned-questions?course_code=Biology', {
        method: 'DELETE',
      }), {} as any) as any

      expect(response.body.deletedCount).toBe(1)
      expect(mockPinnedFind.mock.results[0].value.limit).toHaveBeenCalledWith(250)
      expect(mockPinnedDeleteMany).toHaveBeenCalledWith({
        student_id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        _id: { $in: [pinId] },
      })
    })
  })
})
