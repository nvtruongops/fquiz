/**
 * Unit tests for History API routes
 * Covers:
 *   GET /api/history?page=&limit=  (Requirements 9.1, 9.2, 9.4)
 *   GET /api/history/[id]          (Requirements 9.3, 9.4)
 *
 * Requirement 9.1: Result_Service SHALL persist session result including Quiz ID,
 *   Student ID, score, total questions, mode, and completion timestamp.
 * Requirement 9.2: Result_Service SHALL return a paginated list of completed
 *   Quiz_Sessions ordered by completion timestamp descending.
 * Requirement 9.3: Result_Service SHALL return each Question, the Student's
 *   submitted answer, the correct answer, and the final score.
 * Requirement 9.4: Without a valid Student JWT token, the Result_Service SHALL
 *   reject the request with HTTP 401.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logSecurityEvent: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
  logSessionError: jest.fn(),
}))
jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}))
jest.mock('@/models/QuizSession', () => ({
  QuizSession: {
    aggregate: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
}))
jest.mock('@/models/Quiz', () => ({
  Quiz: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}))
// Do NOT mock mongoose — we need Types.ObjectId to work correctly

// ─── Imports ──────────────────────────────────────────────────────────────────

import { GET as historyListHandler } from '@/app/api/history/route'
import { GET as historyDetailHandler } from '@/app/api/history/[id]/route'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'
import { Types } from 'mongoose'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method: 'GET', headers })
}

function makeAuthRequest(url: string): Request {
  return makeRequest(url, { Authorization: 'Bearer valid.jwt.token' })
}

const studentId = new Types.ObjectId()
const quizId1 = new Types.ObjectId()
const quizId2 = new Types.ObjectId()
const sessionId1 = new Types.ObjectId()
const sessionId2 = new Types.ObjectId()

const mockStudentPayload = {
  userId: studentId.toString(),
  role: 'student' as const,
  iat: 1000,
  exp: 9999999999,
}

const mockAdminPayload = {
  userId: new Types.ObjectId().toString(),
  role: 'admin' as const,
  iat: 1000,
  exp: 9999999999,
}

const mockQuiz1 = {
  _id: quizId1,
  title: 'JavaScript Basics',
  questions: [
    {
      _id: new Types.ObjectId(),
      text: 'What is closure?',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: [1],
      explanation: 'A closure is...',
    },
    {
      _id: new Types.ObjectId(),
      text: 'What is hoisting?',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: [2],
      explanation: 'Hoisting is...',
    },
  ],
}

const mockQuiz2 = {
  _id: quizId2,
  title: 'TypeScript Advanced',
  questions: [
    {
      _id: new Types.ObjectId(),
      text: 'What is a generic?',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: [0],
    },
  ],
}

const now = new Date()
const earlier = new Date(now.getTime() - 3600_000) // 1 hour ago

const mockSession1 = {
  _id: sessionId1,
  student_id: studentId,
  quiz_id: quizId1,
  mode: 'immediate',
  status: 'completed',
  score: 2,
  user_answers: [
    { question_index: 0, answer_index: 1, is_correct: true },
    { question_index: 1, answer_index: 2, is_correct: true },
  ],
  completed_at: now,
  started_at: new Date(now.getTime() - 600_000),
}

const mockSession2 = {
  _id: sessionId2,
  student_id: studentId,
  quiz_id: quizId2,
  mode: 'review',
  status: 'completed',
  score: 0,
  user_answers: [
    { question_index: 0, answer_index: 3, is_correct: false },
  ],
  completed_at: earlier,
  started_at: new Date(earlier.getTime() - 300_000),
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/history — List
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/history', () => {
  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when no JWT is provided (Req 9.4)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)

    const res = await historyListHandler(makeRequest('http://localhost/api/history'))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 403 when JWT belongs to an admin (not a student)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockAdminPayload)

    const res = await historyListHandler(makeAuthRequest('http://localhost/api/history'))
    expect(res.status).toBe(403)
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with paginated history for authenticated student (Req 9.2)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([
      {
        quiz_id: quizId1,
        latest_session_id: sessionId1,
        score: 2,
        mode: 'immediate',
        completed_at: now,
        started_at: mockSession1.started_at,
        total_study_minutes: 10,
        attempt_count: 2,
      },
      {
        quiz_id: quizId2,
        latest_session_id: sessionId2,
        score: 0,
        mode: 'review',
        completed_at: earlier,
        started_at: mockSession2.started_at,
        total_study_minutes: 5,
        attempt_count: 1,
      },
    ])
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([mockQuiz1, mockQuiz2]) })

    const res = await historyListHandler(makeAuthRequest('http://localhost/api/history'))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.history).toHaveLength(2)
    expect(data.total).toBe(2)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(20)
    expect(data.totalPages).toBe(1)
  })

  it('includes quiz_title, score, mode, completed_at in each history item (Req 9.1)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([
      {
        quiz_id: quizId1,
        latest_session_id: sessionId1,
        score: 2,
        mode: 'immediate',
        completed_at: now,
        started_at: mockSession1.started_at,
        total_study_minutes: 10,
        attempt_count: 2,
      },
    ])
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([mockQuiz1]) })

    const res = await historyListHandler(makeAuthRequest('http://localhost/api/history'))
    const data = await res.json()

    const item = data.history[0]
    expect(item.quiz_title).toBe('JavaScript Basics')
    expect(item.score).toBe(2)
    expect(item.mode).toBe('immediate')
    expect(item.completed_at).toBeDefined()
    expect(item.quiz_id).toBeDefined()
    expect(item.latest_session_id).toBeDefined()
    expect(item.total_questions).toBe(2)
    expect(item.total_study_minutes).toBe(10)
    expect(item.attempt_count).toBe(2)
  })

  // ── Ordering ──────────────────────────────────────────────────────────────

  it('builds aggregate pipeline sorted by completed_at descending (Req 9.2)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([])
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })

    await historyListHandler(makeAuthRequest('http://localhost/api/history'))

    const pipeline = (QuizSession.aggregate as jest.Mock).mock.calls[0][0]
    expect(pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $sort: { completed_at: -1 } }),
      ])
    )
  })

  // ── Pagination ────────────────────────────────────────────────────────────

  it('uses page=1 and limit=20 as defaults', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([])
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })

    const res = await historyListHandler(makeAuthRequest('http://localhost/api/history'))
    const data = await res.json()

    expect(data.page).toBe(1)
    expect(data.limit).toBe(20)
    expect(data.totalPages).toBe(1)
  })

  it('respects custom page and limit query params', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    const grouped = Array.from({ length: 50 }, (_, i) => ({
      quiz_id: new Types.ObjectId(),
      latest_session_id: new Types.ObjectId(),
      score: i,
      mode: i % 2 === 0 ? 'immediate' : 'review',
      completed_at: new Date(now.getTime() - i * 60_000),
      started_at: new Date(now.getTime() - (i + 1) * 60_000),
      total_study_minutes: i + 1,
      attempt_count: 1,
    }))
    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue(grouped)
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })

    const res = await historyListHandler(
      makeAuthRequest('http://localhost/api/history?page=3&limit=10')
    )
    const data = await res.json()

    expect(data.page).toBe(3)
    expect(data.limit).toBe(10)
    expect(data.totalPages).toBe(5) // ceil(50/10)
    expect(data.history).toHaveLength(10)
  })

  it('clamps page to minimum 1 for invalid page param', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([])
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })

    const res = await historyListHandler(
      makeAuthRequest('http://localhost/api/history?page=-5')
    )
    const data = await res.json()
    expect(data.page).toBe(1)
  })

  it('clamps limit to maximum 100', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([])
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })

    const res = await historyListHandler(
      makeAuthRequest('http://localhost/api/history?limit=999')
    )
    const data = await res.json()
    expect(data.limit).toBe(100)
  })

  it('returns empty history array when student has no completed sessions', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([])
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })

    const res = await historyListHandler(makeAuthRequest('http://localhost/api/history'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.history).toEqual([])
    expect(data.total).toBe(0)
    expect(data.totalPages).toBe(1)
  })

  // ── DB error ──────────────────────────────────────────────────────────────

  it('returns 503 when DB connection fails', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
    const { connectDB } = require('@/lib/mongodb')
    ;(connectDB as jest.Mock).mockRejectedValueOnce(
      new Error('MongoDB connection failed: timeout')
    )

    const res = await historyListHandler(makeAuthRequest('http://localhost/api/history'))
    expect(res.status).toBe(503)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/history/[id] — Detail
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/history/[id]', () => {
  beforeEach(() => {
    ;(QuizSession.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    })
  })

  function makeDetailRequest(id: string, auth = true): Request {
    const url = `http://localhost/api/history/${id}`
    return auth ? makeAuthRequest(url) : makeRequest(url)
  }

  function makeParams(id: string) {
    return { params: { id } }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when no JWT is provided (Req 9.4)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString(), false),
      makeParams(sessionId1.toString())
    )
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 403 when JWT belongs to an admin', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockAdminPayload)

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    expect(res.status).toBe(403)
  })

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 for an invalid (non-ObjectId) session id', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    const res = await historyDetailHandler(
      makeDetailRequest('not-a-valid-id'),
      makeParams('not-a-valid-id')
    )
    expect(res.status).toBe(400)
  })

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns 404 when session does not exist (Req 9.3)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
    ;(QuizSession.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when session belongs to a different student', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    const otherStudentId = new Types.ObjectId()
    const sessionOwnedByOther = { ...mockSession1, student_id: otherStudentId }
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(sessionOwnedByOther),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    expect(res.status).toBe(403)
  })

  it('returns 403 when session is not completed', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    const activeSession = { ...mockSession1, status: 'active' }
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(activeSession),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    expect(res.status).toBe(403)
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with full session detail including correct_answers (Req 9.3)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSession1),
    })
    ;(Quiz.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockQuiz1),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data._id).toBeDefined()
    expect(data.quiz_title).toBe('JavaScript Basics')
    expect(data.score).toBe(2)
    expect(data.mode).toBe('immediate')
    expect(data.questions).toHaveLength(2)
  })

  it('includes correct_answer for each question in the detail response (Req 9.3)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSession1),
    })
    ;(Quiz.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockQuiz1),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    const data = await res.json()

    for (const q of data.questions) {
      expect(q).toHaveProperty('correct_answer')
    }
  })

  it('includes submitted_answer and is_correct for each question (Req 9.3)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSession1),
    })
    ;(Quiz.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockQuiz1),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    const data = await res.json()

    // First question: student answered 1, correct is 1 → is_correct = true
    const q0 = data.questions[0]
    expect(q0.submitted_answer).toBe(1)
    expect(q0.is_correct).toBe(true)
    expect(q0.correct_answer).toBe(1)

    // Second question: student answered 2, correct is 2 → is_correct = true
    const q1 = data.questions[1]
    expect(q1.submitted_answer).toBe(2)
    expect(q1.is_correct).toBe(true)
    expect(q1.correct_answer).toBe(2)
  })

  it('sets submitted_answer to null for unanswered questions', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    // Session with only one answer for a 2-question quiz
    const partialSession = {
      ...mockSession1,
      user_answers: [{ question_index: 0, answer_index: 1, is_correct: true }],
    }
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(partialSession),
    })
    ;(Quiz.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockQuiz1),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    const data = await res.json()

    // Second question was not answered
    expect(data.questions[1].submitted_answer).toBeNull()
  })

  it('includes explanation when available', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSession1),
    })
    ;(Quiz.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockQuiz1),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    const data = await res.json()

    expect(data.questions[0].explanation).toBe('A closure is...')
    expect(data.questions[1].explanation).toBe('Hoisting is...')
  })

  it('returns null explanation when question has no explanation', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)

    const sessionForQuiz2 = {
      ...mockSession2,
      student_id: studentId,
    }
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(sessionForQuiz2),
    })
    ;(Quiz.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockQuiz2),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId2.toString()),
      makeParams(sessionId2.toString())
    )
    const data = await res.json()

    expect(data.questions[0].explanation).toBeNull()
  })

  it('returns 404 when quiz associated with session is not found', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSession1),
    })
    ;(Quiz.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    })

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    expect(res.status).toBe(404)
  })

  // ── DB error ──────────────────────────────────────────────────────────────

  it('returns 503 when DB connection fails', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockStudentPayload)
    const { connectDB } = require('@/lib/mongodb')
    ;(connectDB as jest.Mock).mockRejectedValueOnce(
      new Error('MongoDB connection failed: timeout')
    )

    const res = await historyDetailHandler(
      makeDetailRequest(sessionId1.toString()),
      makeParams(sessionId1.toString())
    )
    expect(res.status).toBe(503)
  })
})
