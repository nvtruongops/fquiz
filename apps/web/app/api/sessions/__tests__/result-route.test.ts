jest.mock('@/lib/modules/auth/auth', () => ({ verifyToken: jest.fn() }))
jest.mock('@/lib/modules/quiz/session-utils', () => ({ getQuizSessionResult: jest.fn() }))

import { verifyToken } from '@/lib/modules/auth/auth'
import { getQuizSessionResult } from '@/lib/modules/quiz/session-utils'
import { GUEST_ID_COOKIE_NAME } from '@fquiz/auth'
import { GET } from '../[id]/result/route'

describe('GET /api/sessions/[id]/result', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('uses the database-aware verifier before returning a registered result', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId: 'student-1', role: 'student', v: 2 })
    ;(getQuizSessionResult as jest.Mock).mockResolvedValue({ sessionId: 'session-1', score: 1 })

    const response = await GET(
      new Request('https://web.example.test/api/sessions/session-1/result'),
      { params: Promise.resolve({ id: 'session-1' }) }
    )

    expect(verifyToken).toHaveBeenCalled()
    expect(getQuizSessionResult).toHaveBeenCalledWith('session-1', 'student-1', undefined)
    expect(response.status).toBe(200)
  })

  test('does not authenticate an invalid or revoked token as a registered student', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    ;(getQuizSessionResult as jest.Mock).mockResolvedValue(null)

    const response = await GET(
      new Request('https://web.example.test/api/sessions/session-1/result', {
        headers: { cookie: 'auth-token=revoked-token' },
      }),
      { params: Promise.resolve({ id: 'session-1' }) }
    )

    expect(getQuizSessionResult).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
  })

  test('still returns a guest result without a registered token', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    ;(getQuizSessionResult as jest.Mock).mockResolvedValue({
      sessionId: 'session-1',
      is_guest: true,
      score: 1,
    })

    const response = await GET(
      new Request('https://web.example.test/api/sessions/session-1/result', {
        headers: { cookie: `${GUEST_ID_COOKIE_NAME}=123e4567-e89b-42d3-a456-426614174000` },
      }),
      { params: Promise.resolve({ id: 'session-1' }) }
    )

    expect(getQuizSessionResult).toHaveBeenCalledWith('session-1', '', '123e4567-e89b-42d3-a456-426614174000')
    expect(response.status).toBe(200)
  })

  test('rejects roles outside the student access hierarchy', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1', role: 'guest' })

    const response = await GET(
      new Request('https://web.example.test/api/sessions/session-1/result'),
      { params: Promise.resolve({ id: 'session-1' }) }
    )

    expect(response.status).toBe(403)
    expect(getQuizSessionResult).not.toHaveBeenCalled()
  })
})
