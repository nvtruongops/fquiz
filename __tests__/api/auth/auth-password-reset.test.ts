/**
 * Security tests for password reset flow
 * Covers: POST /api/auth/forgot-password, POST /api/auth/reset-password
 *
 * Security properties:
 * - forgot-password never reveals whether email exists (anti-enumeration)
 * - reset token is invalidated after use
 * - expired tokens are rejected
 * - new password is hashed, not stored in plain text
 * - short passwords are rejected
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logSecurityEvent: jest.fn(),
  logRateLimitTriggered: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
  logSessionError: jest.fn(),
}))
jest.mock('@/models/User', () => ({
  User: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}))
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('new-hashed-password'),
  compare: jest.fn(),
}))
jest.mock('@/lib/rate-limit/provider', () => ({
  rateLimiter: {
    check: jest.fn().mockResolvedValue({ success: true }),
  },
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST as forgotHandler } from '@/app/api/auth/forgot-password/route'
import { POST as resetHandler } from '@/app/api/auth/reset-password/route'
import { User } from '@/models/User'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, path = '/api/auth/forgot-password'): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockUser = {
  _id: { toString: () => 'user-id-123' },
  email: 'user@example.com',
  reset_token: 'valid-reset-token-abc123',
  reset_token_expires: new Date(Date.now() + 3_600_000), // 1 hour from now
}

const mockUserWithoutCooldown = {
  ...mockUser,
  reset_token: null,
  reset_token_expires: null,
}

beforeEach(() => jest.clearAllMocks())

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 when email exists (does not reveal existence)', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUserWithoutCooldown)
    ;(User.updateOne as jest.Mock).mockResolvedValue({})

    const res = await forgotHandler(makeRequest({ action: 'send', email: 'user@example.com' }))
    expect(res.status).toBe(200)
  })

  it('returns 200 when email does NOT exist (anti-enumeration)', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    const res = await forgotHandler(makeRequest({ action: 'send', email: 'nobody@example.com' }))
    expect(res.status).toBe(200)
  })

  it('returns same response body for existing and non-existing email', async () => {
    // Non-existing email
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    const res1 = await forgotHandler(makeRequest({ action: 'send', email: 'nobody@example.com' }))
    const data1 = await res1.json()

    // Existing email (in production mode, same message)
    process.env.NODE_ENV = 'production'
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUserWithoutCooldown)
    ;(User.updateOne as jest.Mock).mockResolvedValue({})
    const res2 = await forgotHandler(makeRequest({ action: 'send', email: 'user@example.com' }))
    const data2 = await res2.json()
    process.env.NODE_ENV = 'test'

    expect(data1.message).toBe(data2.message)
  })

  it('returns 400 for invalid email format', async () => {
    const res = await forgotHandler(makeRequest({ action: 'send', email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing email', async () => {
    const res = await forgotHandler(makeRequest({ action: 'send' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    })
    const res = await forgotHandler(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 when DB is unavailable', async () => {
    ;(connectDB as jest.Mock).mockRejectedValueOnce(new Error('DB down'))

    const res = await forgotHandler(makeRequest({ action: 'send', email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  it('stores reset_token and reset_token_expires on valid email', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUserWithoutCooldown)
    ;(User.updateOne as jest.Mock).mockResolvedValue({})

    await forgotHandler(makeRequest({ action: 'send', email: 'user@example.com' }))

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({
        reset_token: expect.any(String),
        reset_token_expires: expect.any(Date),
      })
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/reset-password', () => {
  const validBody = { token: 'valid-reset-token-abc123', password: 'NewPassword123' }

  it('returns 200 on successful password reset', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(User.updateOne as jest.Mock).mockResolvedValue({})

    const res = await resetHandler(makeRequest(validBody, '/api/auth/reset-password'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeTruthy()
  })

  it('returns 400 for invalid or expired token', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null) // token not found or expired

    const res = await resetHandler(makeRequest({ token: 'expired-token', password: 'NewPassword123' }, '/api/auth/reset-password'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await resetHandler(makeRequest({ token: 'some-token', password: 'short' }, '/api/auth/reset-password'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when token is missing', async () => {
    const res = await resetHandler(makeRequest({ password: 'NewPassword123' }, '/api/auth/reset-password'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    })
    const res = await resetHandler(req)
    expect(res.status).toBe(400)
  })

  it('hashes the new password before storing', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(User.updateOne as jest.Mock).mockResolvedValue({})

    await resetHandler(makeRequest(validBody, '/api/auth/reset-password'))

    expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10)
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({ password_hash: 'new-hashed-password' })
    )
  })

  it('clears reset_token and reset_token_expires after successful reset', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(User.updateOne as jest.Mock).mockResolvedValue({})

    await resetHandler(makeRequest(validBody, '/api/auth/reset-password'))

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({ reset_token: null, reset_token_expires: null })
    )
  })

  it('does not store plain-text password', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(User.updateOne as jest.Mock).mockResolvedValue({})

    await resetHandler(makeRequest(validBody, '/api/auth/reset-password'))

    const updateCall = (User.updateOne as jest.Mock).mock.calls[0][1]
    expect(updateCall).not.toHaveProperty('password')
    expect(JSON.stringify(updateCall)).not.toContain('NewPassword123')
  })

  it('returns 500 when DB is unavailable', async () => {
    ;(connectDB as jest.Mock).mockRejectedValueOnce(new Error('DB down'))

    const res = await resetHandler(makeRequest(validBody, '/api/auth/reset-password'))
    expect(res.status).toBe(500)
  })
})
