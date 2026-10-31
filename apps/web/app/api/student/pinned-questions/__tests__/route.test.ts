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
      mockPinnedFind.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: new Types.ObjectId('507f1f77bcf86cd799439001'), text: 'Q1', course_code: 'PRN211' },
          ]),
        }),
      })

      const req = new Request('https://web.example.test/api/student/pinned-questions?course_code=PRN211')
      const res = (await GET(req, {} as any)) as any

      expect(res.status).toBe(200)
      expect(res.body.pinnedQuestions).toHaveLength(1)
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
  })
})
