import { NextRequest } from 'next/server'

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { find: jest.fn() } }))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { find: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/Category', () => ({ Category: { find: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({ QuizSession: { aggregate: jest.fn() } }))
jest.mock('@/lib/modules/auth/auth', () => ({ verifyToken: jest.fn() }))
jest.mock('@/lib/core/security/rate-limit/public-api', () => ({ checkPublicApiRateLimit: jest.fn() }))

import { GET as publicGET } from '../public/quizzes/route'
import { GET as exploreGET } from '../explore/quizzes/route'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { User } from '@/lib/modules/auth/models/User'
import { Category } from '@/lib/modules/quiz/models/Category'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { verifyToken } from '@/lib/modules/auth/auth'
import { checkPublicApiRateLimit } from '@/lib/core/security/rate-limit/public-api'

const categoryId = '507f1f77bcf86cd799439012'
const creatorId = '507f1f77bcf86cd799439013'
const quizId = '507f1f77bcf86cd799439014'
const internalMessage = 'SENTINEL mongodb://private-host credentials stack details'

function queryChain(rows: unknown[]) {
  return {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(rows),
  }
}

function request(params: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/v1/public/quizzes?${new URLSearchParams(params)}`)
}

let quizzes: ReturnType<typeof queryChain>

beforeEach(() => {
  jest.resetAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(connectDB as jest.Mock).mockResolvedValue(undefined)
  ;(verifyToken as jest.Mock).mockResolvedValue(null)
  ;(checkPublicApiRateLimit as jest.Mock).mockResolvedValue(null)
  quizzes = queryChain([])
  ;(Quiz.find as jest.Mock).mockReturnValue(quizzes)
  ;(User.find as jest.Mock).mockReturnValue(queryChain([]))
  ;(Category.find as jest.Mock).mockReturnValue(queryChain([]))
  ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([])
})

afterEach(() => jest.restoreAllMocks())

describe.each([
  ['public', publicGET, { created_at: -1 }, 503],
  ['explore', exploreGET, { studentCount: -1 }, 500],
] as const)('%s quiz listing', (_name, GET, defaultSort, connectionStatus) => {
  it.each([
    ['limit', '0'], ['limit', '-1'], ['limit', '101'], ['limit', '1.5'],
    ['limit', '20junk'], ['limit', 'NaN'], ['limit', 'Infinity'], ['limit', ''],
    ['limit', '1e2'], ['limit', '0x10'],
    ['offset', '-1'], ['offset', '100001'], ['offset', '1.5'],
    ['offset', '20junk'], ['offset', 'NaN'], ['offset', 'Infinity'], ['offset', ''],
    ['search', 'x'.repeat(201)], ['category_id', 'not-an-object-id'],
  ])('rejects invalid %s=%s before database work', async (key, value) => {
    const response = await GET(request({ [key]: value }))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.any(String) })
    expect(connectDB).not.toHaveBeenCalled()
    expect(Quiz.find).not.toHaveBeenCalled()
    expect(User.find).not.toHaveBeenCalled()
    expect(Category.find).not.toHaveBeenCalled()
    expect(QuizSession.aggregate).not.toHaveBeenCalled()
  })

  it('preserves defaults, public visibility filters and the data envelope', async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: [] })
    expect(Quiz.find).toHaveBeenCalledWith({
      is_public: true, status: 'published',
      is_temp: { $ne: true }, is_saved_from_explore: { $ne: true },
    })
    expect(quizzes.limit).toHaveBeenCalledWith(20)
    expect(quizzes.skip).toHaveBeenCalledWith(0)
    expect(quizzes.sort).toHaveBeenCalledWith(defaultSort)
    if (_name === 'public') {
      expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=300')
    }
  })

  it.each(['recent', 'newest', 'oldest', 'popular'])('preserves %s sort behavior and bounded filters', async sort => {
    const response = await GET(request({ sort, category_id: categoryId, search: 'a.b+', limit: '100', offset: '100000' }))
    expect(response.status).toBe(200)
    expect(Quiz.find).toHaveBeenCalledWith(expect.objectContaining({
      category_id: categoryId,
      $or: [
        { title: { $regex: 'a\\.b\\+', $options: 'i' } },
        { course_code: { $regex: 'a\\.b\\+', $options: 'i' } },
      ],
    }))
    expect(quizzes.sort).toHaveBeenCalledWith(sort === 'popular' ? { studentCount: -1 } : { created_at: -1 })
    expect(quizzes.limit).toHaveBeenCalledWith(100)
    expect(quizzes.skip).toHaveBeenCalledWith(100000)
  })

  it('accepts an empty optional category, minimum limit and maximum search length', async () => {
    const response = await GET(request({ category_id: '', search: 'x'.repeat(200), limit: '1', offset: '0' }))
    expect(response.status).toBe(200)
    expect((Quiz.find as jest.Mock).mock.calls[0][0]).not.toHaveProperty('category_id')
    expect(quizzes.limit).toHaveBeenCalledWith(1)
    expect(quizzes.skip).toHaveBeenCalledWith(0)
  })

  it('preserves joined DTO fields and missing-join fallbacks', async () => {
    quizzes.lean.mockResolvedValue([
      { _id: quizId, title: 'Dummy quiz', course_code: 'TEST', category_id: categoryId, created_by: creatorId, questionCount: 4, studentCount: 7 },
      { _id: '507f1f77bcf86cd799439015', title: 'No joins', course_code: 'NONE', questionCount: 2 },
    ])
    ;(User.find as jest.Mock).mockReturnValue(queryChain([{ _id: creatorId, username: 'dummy-creator' }]))
    ;(Category.find as jest.Mock).mockReturnValue(queryChain([{ _id: categoryId, name: 'Dummy category' }]))
    const response = await GET(request())
    expect(await response.json()).toEqual({ data: [
      {
        id: quizId, title: 'Dummy quiz', course_code: 'TEST', source_type: 'explore_public',
        source_label: 'Public Library', source_creator_name: 'dummy-creator', questionCount: 4, studentCount: 7,
        categoryId, categoryName: 'Dummy category', latestCorrectCount: null, latestTotalCount: null,
        latestScoreOnTen: null, totalStudyMinutes: null,
      },
      {
        id: '507f1f77bcf86cd799439015', title: 'No joins', course_code: 'NONE', source_type: 'explore_public',
        source_label: 'Public Library', source_creator_name: null, questionCount: 2, studentCount: 0,
        categoryId: '', categoryName: 'Uncategorized', latestCorrectCount: null, latestTotalCount: null,
        latestScoreOnTen: null, totalStudyMinutes: null,
      },
    ] })
    expect(User.find).toHaveBeenCalledTimes(1)
    expect(Category.find).toHaveBeenCalledTimes(1)
  })

  it('does not expose connection exception details', async () => {
    ;(connectDB as jest.Mock).mockRejectedValue(new TypeError(internalMessage))
    const response = await GET(request())
    expect(response.status).toBe(connectionStatus)
    expect(await response.json()).toEqual({ error: expect.any(String) })
    expect(Quiz.find).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  it('does not expose query exception details', async () => {
    quizzes.lean.mockRejectedValue(new TypeError(internalMessage))
    const response = await GET(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Failed to fetch quizzes' })
    expect(console.error).toHaveBeenCalled()
  })
})

it('maps multiple personalized sessions correctly with linear quiz-ID work', async () => {
  const ids = ['quiz-a', 'quiz-b', 'quiz-c', 'quiz-d'].map(id => ({ toString: jest.fn(() => id) }))
  quizzes.lean.mockResolvedValue(ids.map((_id, index) => ({ _id, title: `Quiz ${index}`, questionCount: [4, 3, 0, 5][index] })))
  ;(verifyToken as jest.Mock).mockResolvedValue({ userId: creatorId, role: 'student' })
  ;(QuizSession.aggregate as jest.Mock)
    .mockResolvedValueOnce([
      { _id: 'quiz-d', score: 0 }, { _id: 'quiz-c', score: 0 }, { _id: 'quiz-b', score: 2 },
    ])
    .mockResolvedValueOnce([
      { _id: 'quiz-b', totalDurationMs: 90000 }, { _id: 'quiz-c', totalDurationMs: 0 },
    ])

  const response = await exploreGET(request())
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.data.map((q: Record<string, unknown>) => [q.id, q.latestCorrectCount, q.latestTotalCount, q.latestScoreOnTen, q.totalStudyMinutes])).toEqual([
    ['quiz-a', null, null, null, null], ['quiz-b', 2, 3, 6.67, 2],
    ['quiz-c', 0, 0, null, 0], ['quiz-d', 0, 5, 0, 0],
  ])
  expect(QuizSession.aggregate).toHaveBeenCalledTimes(2)
  expect(ids.reduce((sum, id) => sum + id.toString.mock.calls.length, 0)).toBeLessThanOrEqual(2 * ids.length)
})

it('retains the public rate-limit response without database work', async () => {
  const limited = new Response(null, { status: 429 })
  ;(checkPublicApiRateLimit as jest.Mock).mockResolvedValue(limited)
  expect(await publicGET(request())).toBe(limited)
  expect(connectDB).not.toHaveBeenCalled()
})
