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

describe('API v1 Learning Routes', () => {
  let mockVocabService: any
  let mockSentenceService: any
  let mockLessonRepo: any
  let mockLessonLearningService: any
  let mockCourseRepo: any
  let mockCourseLearningService: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockVocabService = {
      listByLanguage: jest.fn().mockResolvedValue([{ lemma: 'test' }]),
      listByCEFR: jest.fn().mockResolvedValue([{ lemma: 'cefr-test' }]),
      create: jest.fn().mockResolvedValue({ _id: 'new-vocab', lemma: 'hello' }),
      getById: jest.fn().mockResolvedValue({ lemma: 'get-vocab' }),
      update: jest.fn().mockResolvedValue({ lemma: 'update-vocab' }),
      delete: jest.fn().mockResolvedValue(true),
    }

    mockSentenceService = {
      listByLanguage: jest.fn().mockResolvedValue([{ text: 'sentence' }]),
      getParagraphSentences: jest.fn().mockResolvedValue([{ text: 'para-sentence' }]),
      create: jest.fn().mockResolvedValue({ text: 'new-sentence' }),
      createWithVocabLinks: jest.fn().mockResolvedValue({ text: 'vocab-sentence' }),
      getWithRelations: jest.fn().mockResolvedValue({ sentence: { text: 'with-rel' } }),
      update: jest.fn().mockResolvedValue({ text: 'update-sentence' }),
      delete: jest.fn().mockResolvedValue(true),
    }

    mockLessonRepo = {
      findByModule: jest.fn().mockResolvedValue([{ title: 'lesson' }]),
      create: jest.fn().mockResolvedValue({ title: 'new-lesson' }),
      findById: jest.fn().mockResolvedValue({ title: 'get-lesson' }),
      update: jest.fn().mockResolvedValue({ title: 'update-lesson' }),
      delete: jest.fn().mockResolvedValue(true),
    }

    mockLessonLearningService = {
      loadLesson: jest.fn().mockResolvedValue({ lesson: { title: 'loaded-lesson' } }),
      completeLesson: jest.fn().mockResolvedValue(undefined),
    }

    mockCourseRepo = {
      findByLanguage: jest.fn().mockResolvedValue([{ title: 'course' }]),
      findByCEFR: jest.fn().mockResolvedValue([{ title: 'cefr-course' }]),
      create: jest.fn().mockResolvedValue({ title: 'new-course' }),
      findById: jest.fn().mockResolvedValue({ title: 'get-course' }),
      update: jest.fn().mockResolvedValue({ title: 'update-course' }),
      delete: jest.fn().mockResolvedValue(true),
    }

    mockCourseLearningService = {
      getCourseStructure: jest.fn().mockResolvedValue({ course: { title: 'course-struct' } }),
    }

    // Mock DI Container resolves
    jest.spyOn(container, 'resolve').mockImplementation((token: string) => {
      if (token === 'VocabularyService') return mockVocabService
      if (token === 'SentenceService') return mockSentenceService
      if (token === 'LessonRepository') return mockLessonRepo
      if (token === 'LessonLearningService') return mockLessonLearningService
      if (token === 'CourseRepository') return mockCourseRepo
      if (token === 'CourseLearningService') return mockCourseLearningService
      throw new Error(`Unexpected token: ${token}`)
    })
  })

  describe('Vocabulary API', () => {
    it('should list vocabulary by language', async () => {
      const { GET } = require('../vocabulary/route')
      const req = new Request('http://localhost/api/v1/learning/vocabulary?languageId=507f1f77bcf86cd799439011')
      const res = await GET(req)
      expect(mockVocabService.listByLanguage).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 0, 20)
      expect(res.body.items).toBeDefined()
    })

    it('should list vocabulary by CEFR level', async () => {
      const { GET } = require('../vocabulary/route')
      const req = new Request('http://localhost/api/v1/learning/vocabulary?languageId=507f1f77bcf86cd799439011&cefrLevel=A1')
      const res = await GET(req)
      expect(mockVocabService.listByCEFR).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'A1', 0, 20)
      expect(res.body.items).toBeDefined()
    })

    it('should create vocabulary', async () => {
      const { POST } = require('../vocabulary/route')
      const req = new Request('http://localhost/api/v1/learning/vocabulary', {
        method: 'POST',
        body: JSON.stringify({
          lemma: 'test',
          display: 'test',
          definition: 'A test case',
          partOfSpeech: 'noun',
          languageId: '507f1f77bcf86cd799439011',
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(res.body.vocabulary).toBeDefined()
    })
  })

  describe('Sentence API', () => {
    it('should list sentences by language', async () => {
      const { GET } = require('../sentence/route')
      const req = new Request('http://localhost/api/v1/learning/sentence?languageId=507f1f77bcf86cd799439011')
      const res = await GET(req)
      expect(mockSentenceService.listByLanguage).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 0, 20)
      expect(res.body.items).toBeDefined()
    })

    it('should create sentence', async () => {
      const { POST } = require('../sentence/route')
      const req = new Request('http://localhost/api/v1/learning/sentence', {
        method: 'POST',
        body: JSON.stringify({
          text: 'This is a test sentence.',
          languageId: '507f1f77bcf86cd799439011',
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(res.body.sentence).toBeDefined()
    })
  })

  describe('Lesson API', () => {
    it('should load lesson by ID', async () => {
      const { GET } = require('../lesson/route')
      const req = new Request('http://localhost/api/v1/learning/lesson?lessonId=507f1f77bcf86cd799439012')
      const res = await GET(req)
      expect(mockLessonLearningService.loadLesson).toHaveBeenCalledWith('user-123', '507f1f77bcf86cd799439012')
      expect(res.body.lesson).toBeDefined()
    })

    it('should complete lesson', async () => {
      const { POST } = require('../lesson/[id]/complete/route')
      const req = new Request('http://localhost/api/v1/learning/lesson/507f1f77bcf86cd799439012/complete', {
        method: 'POST',
        body: JSON.stringify({ version: 2 }),
      })
      const res = await POST(req, { params: Promise.resolve({ id: '507f1f77bcf86cd799439012' }) })
      expect(mockLessonLearningService.completeLesson).toHaveBeenCalledWith('user-123', '507f1f77bcf86cd799439012', 2)
      expect(res.body.success).toBe(true)
    })
  })

  describe('Course API', () => {
    it('should list courses by language', async () => {
      const { GET } = require('../course/route')
      const req = new Request('http://localhost/api/v1/learning/course?languageId=507f1f77bcf86cd799439011')
      const res = await GET(req)
      expect(mockCourseRepo.findByLanguage).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(res.body.items).toBeDefined()
    })

    it('should load course structure', async () => {
      const { GET } = require('../course/route')
      const req = new Request('http://localhost/api/v1/learning/course?courseId=507f1f77bcf86cd799439013')
      const res = await GET(req)
      expect(mockCourseLearningService.getCourseStructure).toHaveBeenCalledWith('user-123', '507f1f77bcf86cd799439013')
      expect(res.body.course).toBeDefined()
    })
  })
})
