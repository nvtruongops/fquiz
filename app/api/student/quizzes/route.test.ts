/**
 * Unit tests for POST /api/student/quizzes
 * Covers: auth, input validation, security (XSS, image, course_code), duplicate detection, DB errors
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }))
jest.mock('@/lib/cloudinary', () => ({ uploadImage: jest.fn() }))
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose')
  return {
    ...actual,
    Types: {
      ...actual.Types,
      ObjectId: jest.fn().mockImplementation((id?: string) => ({ toString: () => id ?? 'mock-id' })),
    },
  }
})
jest.mock('@/models/Quiz', () => ({
  Quiz: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}))
jest.mock('@/models/Category', () => ({
  Category: { findById: jest.fn() },
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST } from './route'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { Category } from '@/models/Category'
import { uploadImage } from '@/lib/cloudinary'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_USER_ID = '64a1b2c3d4e5f6a7b8c9d0e0'
const VALID_CATEGORY_ID = '64a1b2c3d4e5f6a7b8c9d0e1'

const mockStudentPayload = { userId: VALID_USER_ID, role: 'student' as const, iat: 0, exp: 9999999999 }

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/student/quizzes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
    body: JSON.stringify(body),
  })
}

const validQuestion = {
  text: 'What is 2+2?',
  options: ['1', '2', '3', '4'],
  correct_answer: [3],
}

const validBody = {
  title: 'My Quiz',
  course_code: 'MATH101',
  category_id: VALID_CATEGORY_ID,
  questions: [validQuestion],
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
  ;(Quiz.findOne as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  })
  ;(Category.findById as jest.Mock).mockResolvedValue({ _id: VALID_CATEGORY_ID, name: 'Math' })
  ;(Quiz.create as jest.Mock).mockResolvedValue({ _id: 'new-quiz-id', ...validBody })
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('Authentication', () => {
  it('returns 401 when no token', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 401 when role is admin (not student)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId: VALID_USER_ID, role: 'admin' })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })
})

// ─── Input Validation ─────────────────────────────────────────────────────────

describe('Input validation', () => {
  it('returns 400 when title is missing', async () => {
    const { title: _, ...noTitle } = validBody
    const res = await POST(makeRequest(noTitle))
    expect(res.status).toBe(400)
  })

  it('returns 400 when title is empty string', async () => {
    const res = await POST(makeRequest({ ...validBody, title: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when title exceeds 200 chars', async () => {
    const res = await POST(makeRequest({ ...validBody, title: 'a'.repeat(201) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when course_code is missing', async () => {
    const { course_code: _, ...noCode } = validBody
    const res = await POST(makeRequest(noCode))
    expect(res.status).toBe(400)
  })

  it('returns 400 when course_code contains invalid characters', async () => {
    const res = await POST(makeRequest({ ...validBody, course_code: 'MATH 101; DROP TABLE' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when category_id is not a valid ObjectId', async () => {
    const res = await POST(makeRequest({ ...validBody, category_id: 'not-an-objectid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when questions array is empty', async () => {
    const res = await POST(makeRequest({ ...validBody, questions: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when questions exceed 100', async () => {
    const questions = Array.from({ length: 101 }, () => validQuestion)
    const res = await POST(makeRequest({ ...validBody, questions }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when question has fewer than 2 options', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ text: 'Q?', options: ['only one'], correct_answer: [0] }],
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when correct_answer index is out of bounds', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ text: 'Q?', options: ['A', 'B'], correct_answer: [5] }],
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/student/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─── Security ─────────────────────────────────────────────────────────────────

describe('Security', () => {
  it('strips HTML tags from title before saving', async () => {
    const res = await POST(makeRequest({ ...validBody, title: '<script>alert(1)</script>My Quiz' }))
    expect(res.status).toBe(201)
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.title).not.toContain('<script>')
    expect(created.title).toContain('My Quiz')
  })

  it('strips HTML tags from question text', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, text: '<b>Bold</b> question?' }],
    }))
    expect(res.status).toBe(201)
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.questions[0].text).not.toContain('<b>')
  })

  it('rejects image_url with HTTP (non-HTTPS) URL', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: 'http://evil.com/img.png' }],
    }))
    expect(res.status).toBe(400)
  })

  it('rejects base64 image with disallowed MIME type', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: 'data:image/svg+xml;base64,PHN2Zy8+' }],
    }))
    expect(res.status).toBe(400)
  })

  it('rejects base64 image exceeding 5MB', async () => {
    // ~6MB base64 string
    const bigBase64 = 'A'.repeat(8 * 1024 * 1024)
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: `data:image/jpeg;base64,${bigBase64}` }],
    }))
    expect(res.status).toBe(400)
  })

  it('accepts valid HTTPS image URL', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' }],
    }))
    expect(res.status).toBe(201)
  })
})

// ─── Business Logic ───────────────────────────────────────────────────────────

describe('Business logic', () => {
  it('returns 404 when category does not exist', async () => {
    ;(Category.findById as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(404)
  })

  it('returns 409 when course_code already exists for this student', async () => {
    ;(Quiz.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'existing' }) }),
    })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/MATH101/)
  })

  it('normalizes course_code to uppercase', async () => {
    const res = await POST(makeRequest({ ...validBody, course_code: 'math101' }))
    expect(res.status).toBe(201)
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.course_code).toBe('MATH101')
  })

  it('creates quiz with is_public=false for students', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.is_public).toBe(false)
  })

  it('creates quiz and returns 201 with valid data', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.quiz).toBeDefined()
  })

  it('returns 409 on MongoDB duplicate key error (code 11000)', async () => {
    ;(Quiz.create as jest.Mock).mockRejectedValue({ code: 11000 })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
  })

  it('uploads base64 image to Cloudinary and replaces image_url', async () => {
    const fakeUrl = 'https://res.cloudinary.com/demo/image/upload/q_0.jpg'
    ;(uploadImage as jest.Mock).mockResolvedValue(fakeUrl)
    const base64 = 'data:image/jpeg;base64,' + 'A'.repeat(100)
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: base64 }],
    }))
    expect(res.status).toBe(201)
    expect(uploadImage).toHaveBeenCalledWith(base64, expect.objectContaining({ folder: expect.stringContaining('fquiz/quizzes') }))
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.questions[0].image_url).toBe(fakeUrl)
  })
})


// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('Authentication', () => {
  it('returns 401 when no token', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 401 when role is admin (not student)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId: 'admin-id', role: 'admin' })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })
})

// ─── Input Validation ─────────────────────────────────────────────────────────

describe('Input validation', () => {
  it('returns 400 when title is missing', async () => {
    const { title: _, ...noTitle } = validBody
    const res = await POST(makeRequest(noTitle))
    expect(res.status).toBe(400)
  })

  it('returns 400 when title is empty string', async () => {
    const res = await POST(makeRequest({ ...validBody, title: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when title exceeds 200 chars', async () => {
    const res = await POST(makeRequest({ ...validBody, title: 'a'.repeat(201) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when course_code is missing', async () => {
    const { course_code: _, ...noCode } = validBody
    const res = await POST(makeRequest(noCode))
    expect(res.status).toBe(400)
  })

  it('returns 400 when course_code contains invalid characters', async () => {
    const res = await POST(makeRequest({ ...validBody, course_code: 'MATH 101; DROP TABLE' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when category_id is not a valid ObjectId', async () => {
    const res = await POST(makeRequest({ ...validBody, category_id: 'not-an-objectid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when questions array is empty', async () => {
    const res = await POST(makeRequest({ ...validBody, questions: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when questions exceed 100', async () => {
    const questions = Array.from({ length: 101 }, () => validQuestion)
    const res = await POST(makeRequest({ ...validBody, questions }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when question has fewer than 2 options', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ text: 'Q?', options: ['only one'], correct_answer: [0] }],
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when correct_answer index is out of bounds', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ text: 'Q?', options: ['A', 'B'], correct_answer: [5] }],
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/student/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─── Security ─────────────────────────────────────────────────────────────────

describe('Security', () => {
  it('strips HTML tags from title before saving', async () => {
    const res = await POST(makeRequest({ ...validBody, title: '<script>alert(1)</script>My Quiz' }))
    expect(res.status).toBe(201)
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.title).not.toContain('<script>')
    expect(created.title).toContain('My Quiz')
  })

  it('strips HTML tags from question text', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, text: '<b>Bold</b> question?' }],
    }))
    expect(res.status).toBe(201)
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.questions[0].text).not.toContain('<b>')
  })

  it('rejects image_url with HTTP (non-HTTPS) URL', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: 'http://evil.com/img.png' }],
    }))
    expect(res.status).toBe(400)
  })

  it('rejects base64 image with disallowed MIME type', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: 'data:image/svg+xml;base64,PHN2Zy8+' }],
    }))
    expect(res.status).toBe(400)
  })

  it('rejects base64 image exceeding 5MB', async () => {
    // ~6MB base64 string
    const bigBase64 = 'A'.repeat(8 * 1024 * 1024)
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: `data:image/jpeg;base64,${bigBase64}` }],
    }))
    expect(res.status).toBe(400)
  })

  it('accepts valid HTTPS image URL', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' }],
    }))
    expect(res.status).toBe(201)
  })
})

// ─── Business Logic ───────────────────────────────────────────────────────────

describe('Business logic', () => {
  it('returns 404 when category does not exist', async () => {
    ;(Category.findById as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(404)
  })

  it('returns 409 when course_code already exists for this student', async () => {
    ;(Quiz.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'existing' }) }),
    })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/MATH101/)
  })

  it('normalizes course_code to uppercase', async () => {
    const res = await POST(makeRequest({ ...validBody, course_code: 'math101' }))
    expect(res.status).toBe(201)
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.course_code).toBe('MATH101')
  })

  it('creates quiz with is_public=false for students', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.is_public).toBe(false)
  })

  it('creates quiz and returns 201 with valid data', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.quiz).toBeDefined()
  })

  it('returns 409 on MongoDB duplicate key error (code 11000)', async () => {
    ;(Quiz.create as jest.Mock).mockRejectedValue({ code: 11000 })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
  })

  it('uploads base64 image to Cloudinary and replaces image_url', async () => {
    const fakeUrl = 'https://res.cloudinary.com/demo/image/upload/q_0.jpg'
    ;(uploadImage as jest.Mock).mockResolvedValue(fakeUrl)
    const base64 = 'data:image/jpeg;base64,' + 'A'.repeat(100)
    const res = await POST(makeRequest({
      ...validBody,
      questions: [{ ...validQuestion, image_url: base64 }],
    }))
    expect(res.status).toBe(201)
    expect(uploadImage).toHaveBeenCalledWith(base64, expect.objectContaining({ folder: expect.stringContaining('fquiz/quizzes') }))
    const created = (Quiz.create as jest.Mock).mock.calls[0][0]
    expect(created.questions[0].image_url).toBe(fakeUrl)
  })
})
