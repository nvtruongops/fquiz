/**
 * Unit tests for Password Reset API routes
 * Covers: POST /api/auth/forgot-password, POST /api/auth/reset-password
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
  hash: jest.fn().mockResolvedValue('new_hashed_password'),
}))
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock_reset_token_abc123'),
  }),
}))
jest.mock('@/lib/rate-limit/provider', () => ({
  rateLimiter: {
    check: jest.fn().mockResolvedValue({ success: true }),
  },
}))
jest.mock('@/lib/mail', () => ({
  isMailConfigured: jest.fn().mockReturnValue(false),
  sendVerificationCodeMail: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/verification-code', () => ({
  isValidVerificationCode: jest.fn().mockReturnValue(true),
  hashVerificationCode: jest.fn().mockImplementation((code: string) => `hashed_${code}`),
  generateVerificationCode: jest.fn().mockReturnValue('mock_reset_token_abc123'),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST as forgotHandler } from '@/app/api/auth/forgot-password/route'
import { POST as resetHandler } from '@/app/api/auth/reset-password/route'
import { User } from '@/models/User'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockUser = {
  _id: 'user-id-123',
  email: 'user@example.com',
  reset_token: 'mock_reset_token_abc123',
  reset_token_expires: new Date(Date.now() + 1000 * 60 * 60), // 1h from now
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  ;(User.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 })
})

// ═════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 when email exists and saves token to DB', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

    const res = await forgotHandler(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeTruthy()
    // Token must have been saved to DB (as hashed value)
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({ reset_token: expect.any(String) })
    )
  })

  it('returns 200 even when email does NOT exist (anti-enumeration)', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    const res = await forgotHandler(makeRequest({ email: 'nobody@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeTruthy()
    // Must NOT reveal whether email exists
    expect(data.dev_reset_url).toBeUndefined()
  })

  it('returns same response shape for existing and non-existing email in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })

    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    const res1 = await forgotHandler(makeRequest({ email: 'user@example.com' }))
    const data1 = await res1.json()

    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    const res2 = await forgotHandler(makeRequest({ email: 'nobody@example.com' }))
    const data2 = await res2.json()

    expect(res1.status).toBe(res2.status)
    expect(data1.message).toBe(data2.message)

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })
  })

  it('returns 400 when email is invalid format', async () => {
    const res = await forgotHandler(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email field is missing', async () => {
    const res = await forgotHandler(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    })
    const res = await forgotHandler(req)
    expect(res.status).toBe(400)
  })

  it('returns 503 when DB is unavailable', async () => {
    ;(connectDB as jest.Mock).mockRejectedValueOnce(new Error('DB down'))

    const res = await forgotHandler(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(503)
  })

  it('saves reset_token and reset_token_expires to DB when user exists', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

    await forgotHandler(makeRequest({ email: 'user@example.com' }))

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({
        reset_token: expect.any(String),
        reset_token_expires: expect.any(Date),
      })
    )
  })

  it('does NOT call updateOne when user does not exist', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    await forgotHandler(makeRequest({ email: 'nobody@example.com' }))

    expect(User.updateOne).not.toHaveBeenCalled()
  })

  it('looks up user by lowercased email', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    await forgotHandler(makeRequest({ email: 'USER@EXAMPLE.COM' }))

    expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' })
  })

  it('reset token expires in ~1 hour', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    const before = Date.now()

    await forgotHandler(makeRequest({ email: 'user@example.com' }))

    const updateCall = (User.updateOne as jest.Mock).mock.calls[0][1]
    const expires: Date = updateCall.reset_token_expires
    const diffMs = expires.getTime() - before
    // Should be ~1 hour (3600000ms), allow ±5s tolerance
    expect(diffMs).toBeGreaterThan(3595000)
    expect(diffMs).toBeLessThan(3605000)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RESET PASSWORD
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/reset-password', () => {
  it('returns 200 and resets password with valid token', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

    const res = await resetHandler(makeRequest({ token: 'valid_token', password: 'NewPassword1' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('Password reset successful')
  })

  it('hashes the new password before saving', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

    await resetHandler(makeRequest({ token: 'valid_token', password: 'NewPassword1' }))

    expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword1', 10)
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({ password_hash: 'new_hashed_password' })
    )
  })

  it('clears reset_token and reset_token_expires after successful reset', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

    await resetHandler(makeRequest({ token: 'valid_token', password: 'NewPassword1' }))

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({
        reset_token: null,
        reset_token_expires: null,
      })
    )
  })

  it('returns 400 when token is invalid or not found', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    const res = await resetHandler(makeRequest({ token: 'bad_token', password: 'NewPassword1' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid or expired/i)
  })

  it('returns 400 when token is expired (findOne returns null due to $gt filter)', async () => {
    // Simulate expired token — MongoDB $gt: new Date() would return null
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    const res = await resetHandler(makeRequest({ token: 'expired_token', password: 'NewPassword1' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid or expired/i)
  })

  it('queries DB with token AND expiry check', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

    await resetHandler(makeRequest({ token: 'valid_token', password: 'NewPassword1' }))

    expect(User.findOne).toHaveBeenCalledWith({
      reset_token: 'valid_token',
      reset_token_expires: { $gt: expect.any(Date) },
    })
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await resetHandler(makeRequest({ token: 'valid_token', password: 'short' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when token field is missing', async () => {
    const res = await resetHandler(makeRequest({ password: 'NewPassword1' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when password field is missing', async () => {
    const res = await resetHandler(makeRequest({ token: 'valid_token' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    })
    const res = await resetHandler(req)
    expect(res.status).toBe(400)
  })

  it('returns 503 when DB is unavailable', async () => {
    ;(connectDB as jest.Mock).mockRejectedValueOnce(new Error('DB down'))

    const res = await resetHandler(makeRequest({ token: 'valid_token', password: 'NewPassword1' }))
    expect(res.status).toBe(503)
  })

  it('does NOT update password when token is invalid', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    await resetHandler(makeRequest({ token: 'bad_token', password: 'NewPassword1' }))

    expect(User.updateOne).not.toHaveBeenCalled()
    expect(bcrypt.hash).not.toHaveBeenCalled()
  })
})
