/**
 * Security tests for GET /api/auth/me
 *
 * Security properties:
 * - Returns user info for valid token
 * - Returns { user: null } (not 401) for missing/invalid token (safe for client polling)
 * - Never exposes password_hash or sensitive fields
 * - Returns { user: null } when userId in token doesn't exist in DB
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logSecurityEvent: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
  logSessionError: jest.fn(),
}))
jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }))
jest.mock('@/models/User', () => ({
  User: { findById: jest.fn() },
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { GET as meHandler } from '@/app/api/auth/me/route'
import { verifyToken } from '@/lib/auth'
import { User } from '@/models/User'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(token?: string): Request {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return new Request('http://localhost/api/auth/me', { headers })
}

const mockPayload = { userId: 'user-123', role: 'student' as const, iat: 0, exp: 9999999999 }

const mockUser = {
  username: 'testuser',
  role: 'student',
  avatar_url: 'https://res.cloudinary.com/test/image.jpg',
}

beforeEach(() => jest.clearAllMocks())

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/auth/me', () => {
  it('returns 200 with user info for valid token', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockPayload)
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUser),
    })

    const res = await meHandler(makeRequest('valid.jwt'))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.user).not.toBeNull()
    expect(data.user.name).toBe('testuser')
    expect(data.user.role).toBe('student')
  })

  it('returns { user: null } with 200 when no token provided', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)

    const res = await meHandler(makeRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user).toBeNull()
  })

  it('returns { user: null } when token is valid but user no longer exists in DB', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockPayload)
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    })

    const res = await meHandler(makeRequest('valid.jwt'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user).toBeNull()
  })

  it('never exposes password_hash in response', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockPayload)
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ ...mockUser, password_hash: 'secret-hash' }),
    })

    const res = await meHandler(makeRequest('valid.jwt'))
    const data = await res.json()

    expect(JSON.stringify(data)).not.toContain('password_hash')
    expect(JSON.stringify(data)).not.toContain('secret-hash')
  })

  it('returns 500 on unexpected DB error', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockPayload)
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(new Error('DB crash')),
    })

    const res = await meHandler(makeRequest('valid.jwt'))
    expect(res.status).toBe(500)
  })

  it('returns avatarUrl from avatar_url field', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(mockPayload)
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ ...mockUser, avatar_url: 'https://cdn.example.com/pic.jpg' }),
    })

    const res = await meHandler(makeRequest('valid.jwt'))
    const data = await res.json()
    expect(data.user.avatarUrl).toBe('https://cdn.example.com/pic.jpg')
  })
})
