jest.mock('@/lib/modules/auth/auth', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
  clearUserStatusCache: jest.fn(),
}))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { findById: jest.fn() } }))

import { verifyToken, signToken, clearUserStatusCache } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { GET } from './route'

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(undefined)
  })

  test('clears an invalid or revoked auth cookie', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)

    const response = await GET(new Request('https://web.example.test/api/auth/me', {
      headers: { cookie: 'auth-token=revoked-token' },
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('auth-token=')
  })

  test('does not refresh a token carrying a role that was demoted in the database', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1', role: 'teacher', v: 1 })
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          username: 'learner',
          role: 'student',
          status: 'active',
          token_version: 2,
        }),
      }),
    })

    const response = await GET(new Request('https://web.example.test/api/auth/me', {
      headers: { cookie: 'auth-token=stale-role-token' },
    }))

    expect(response.status).toBe(401)
    expect(clearUserStatusCache).toHaveBeenCalledWith('user-1')
    expect(signToken).not.toHaveBeenCalled()
    expect(response.headers.get('set-cookie')).toContain('auth-token=')
  })
})
