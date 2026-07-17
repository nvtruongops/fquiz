import { NextResponse } from 'next/server'

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

jest.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}))

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx?: any) =>
    handler(req, {
      payload: { userId: 'user-123', role: 'teacher', v: 1 },
      params: ctx?.params,
    }),
}))

import { container } from '@/lib/core/di'

describe('API v1 Learning Singular Routes', () => {
  let mockVocabService: any
  let mockSentenceService: any
  let mockLessonRepo: any
  let mockCourseRepo: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockVocabService = {
      getById: jest.fn().mockResolvedValue({ lemma: 'get-vocab' }),
      update: jest.fn().mockResolvedValue({ lemma: 'update-vocab' }),
      delete: jest.fn().mockResolvedValue(true),
    }

    mockSentenceService = {
      getWithRelations: jest.fn().mockResolvedValue({ sentence: { text: 'with-rel' } }),
      update: jest.fn().mockResolvedValue({ text: 'update-sentence' }),
      delete: jest.fn().mockResolvedValue(true),
    }

    mockLessonRepo = {
      findById: jest.fn().mockResolvedValue({ title: 'get-lesson' }),
      update: jest.fn().mockResolvedValue({ title: 'update-lesson' }),
      delete: jest.fn().mockResolvedValue(true),
    }

    mockCourseRepo = {
      findById: jest.fn().mockResolvedValue({ title: 'get-course' }),
      update: jest.fn().mockResolvedValue({ title: 'update-course' }),
      delete: jest.fn().mockResolvedValue(true),
    }

    // Mock DI Container resolves
    jest.spyOn(container, 'resolve').mockImplementation((token: string) => {
      if (token === 'VocabularyService') return mockVocabService
      if (token === 'SentenceService') return mockSentenceService
      if (token === 'LessonRepository') return mockLessonRepo
      if (token === 'CourseRepository') return mockCourseRepo
      throw new Error(`Unexpected token: ${token}`)
    })
  })

  describe('Vocabulary Singular API', () => {
    it('should get vocabulary by id', async () => {
      const { GET } = require('../vocabulary/[id]/route')
      const req = new Request('http://localhost/api/v1/learning/vocabulary/507f1f77bcf86cd799439011')
      const res = await GET(req, { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) })
      expect(mockVocabService.getById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(res.body.vocabulary).toBeDefined()
    })

    it('should update vocabulary by id', async () => {
      const { PUT } = require('../vocabulary/[id]/route')
      const req = new Request('http://localhost/api/v1/learning/vocabulary/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ lemma: 'updated' }),
      })
      const res = await PUT(req, { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) })
      expect(mockVocabService.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', expect.objectContaining({ lemma: 'updated' }))
      expect(res.body.vocabulary).toBeDefined()
    })

    it('should delete vocabulary by id', async () => {
      const { DELETE } = require('../vocabulary/[id]/route')
      const req = new Request('http://localhost/api/v1/learning/vocabulary/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) })
      expect(mockVocabService.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(res.body.success).toBe(true)
    })
  })

  describe('Sentence Singular API', () => {
    it('should get sentence with relations by id', async () => {
      const { GET } = require('../sentence/[id]/route')
      const req = new Request('http://localhost/api/v1/learning/sentence/507f1f77bcf86cd799439011')
      const res = await GET(req, { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) })
      expect(mockSentenceService.getWithRelations).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(res.body.sentence).toBeDefined()
    })
  })

  describe('Lesson Singular API', () => {
    it('should get lesson by id', async () => {
      const { GET } = require('../lesson/[id]/route')
      const req = new Request('http://localhost/api/v1/learning/lesson/507f1f77bcf86cd799439011')
      const res = await GET(req, { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) })
      expect(mockLessonRepo.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(res.body.lesson).toBeDefined()
    })
  })

  describe('Course Singular API', () => {
    it('should get course by id', async () => {
      const { GET } = require('../course/[id]/route')
      const req = new Request('http://localhost/api/v1/learning/course/507f1f77bcf86cd799439011')
      const res = await GET(req, { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) })
      expect(mockCourseRepo.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(res.body.course).toBeDefined()
    })
  })
})
