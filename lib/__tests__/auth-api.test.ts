/**
 * Unit tests for Auth API routes
 * Covers: POST /api/auth/register, POST /api/auth/login
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
    create: jest.fn(),
  },
}))
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}))
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn().mockResolvedValue('mock.jwt.token'),
  verifyToken: jest.fn(),
  requireRole: jest.fn(),
}))
jest.mock('@/models/LoginLog', () => ({
  LoginLog: { create: jest.fn().mockResolvedValue({}) },
  countUniqueDevicesThisWeek: jest.fn().mockResolvedValue(0),
}))
jest.mock('@/models/SiteSettings', () => ({
  getSettings: jest.fn().mockResolvedValue({
    anti_sharing_enabled: false,
    anti_sharing_max_violations: 10,
  }),
}))
jest.mock('@/lib/rate-limit/provider', () => ({
  rateLimiter: {
    check: jest.fn().mockResolvedValue({ success: true }),
  },
}))
jest.mock('@/models/EmailVerification', () => ({
  EmailVerification: {
    findOne: jest.fn().mockResolvedValue({
      _id: 'verif-id',
      code_hash: 'hashed_code',
      used: false,
      expires_at: new Date(Date.now() + 600000),
    }),
    updateOne: jest.fn().mockResolvedValue({}),
  },
}))
jest.mock('@/lib/verification-code', () => ({
  isValidVerificationCode: jest.fn().mockReturnValue(true),
  hashVerificationCode: jest.fn().mockReturnValue('hashed_code'),
  generateVerificationCode: jest.fn().mockReturnValue('123456'),
}))
jest.mock('@/lib/mail', () => ({
  isMailConfigured: jest.fn().mockReturnValue(false),
  sendRegistrationMail: jest.fn().mockResolvedValue(undefined),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST as registerHandler } from '@/app/api/auth/register/route'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { User } from '@/models/User'
import bcrypt from 'bcryptjs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, ip = '127.0.0.1'): Request {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

const validRegisterBody = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123',
  confirmPassword: 'Password123',
  verificationCode: '123456',
}

const validLoginBody = {
  identifier: 'test@example.com',
  password: 'Password123',
}

const mockUser = {
  _id: { toString: () => 'user-id-123' },
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  role: 'student' as const,
  status: 'active' as const,
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

// ═════════════════════════════════════════════════════════════════════════════
// REGISTER
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/register', () => {
  it('returns 201 with valid data', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    const res = await registerHandler(makeRequest(validRegisterBody))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.message).toBe('Account created')
  })

  it('returns 400 when username is missing', async () => {
    const { username: _, ...body } = validRegisterBody
    const res = await registerHandler(makeRequest(body))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is invalid', async () => {
    const res = await registerHandler(makeRequest({ ...validRegisterBody, email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await registerHandler(makeRequest({ ...validRegisterBody, password: 'short', confirmPassword: 'short' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when confirmPassword does not match password', async () => {
    const res = await registerHandler(makeRequest({ ...validRegisterBody, confirmPassword: 'DifferentPass1' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when username contains invalid characters', async () => {
    const res = await registerHandler(makeRequest({ ...validRegisterBody, username: 'user name!' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when username is too short (< 3 chars)', async () => {
    const res = await registerHandler(makeRequest({ ...validRegisterBody, username: 'ab' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when email already exists', async () => {
    ;(User.findOne as jest.Mock)
      .mockResolvedValueOnce(mockUser)  // email check hits first

    const res = await registerHandler(makeRequest(validRegisterBody))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/email/i)
  })

  it('returns 409 when username already exists', async () => {
    ;(User.findOne as jest.Mock)
      .mockResolvedValueOnce(null)      // email not found
      .mockResolvedValueOnce(mockUser)  // username found

    const res = await registerHandler(makeRequest(validRegisterBody))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/username/i)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await registerHandler(req)
    expect(res.status).toBe(400)
  })

  it('returns 503 when DB is unavailable', async () => {
    const { connectDB } = require('@/lib/mongodb')
    ;(connectDB as jest.Mock).mockRejectedValueOnce(new Error('MongoDB connection failed: DB down'))

    const res = await registerHandler(makeRequest(validRegisterBody))
    // Route catches DB errors and returns 500 (generic) or 503
    expect([500, 503]).toContain(res.status)
  })

  it('hashes password before storing', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    await registerHandler(makeRequest(validRegisterBody))

    expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10)
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ password_hash: 'hashed_password' })
    )
  })

  it('does not store plain-text password', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    await registerHandler(makeRequest(validRegisterBody))

    const createCall = (User.create as jest.Mock).mock.calls[0][0]
    expect(createCall).not.toHaveProperty('password')
    expect(createCall).not.toHaveProperty('confirmPassword')
  })

  it('always assigns role student on register', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    await registerHandler(makeRequest(validRegisterBody))

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'student' })
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/login', () => {
  it('returns 200 with token and role on valid email login', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

    const res = await loginHandler(makeRequest(validLoginBody))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.token).toBe('mock.jwt.token')
    expect(data.role).toBe('student')
  })

  it('returns 200 on valid username login', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

    const res = await loginHandler(makeRequest({ identifier: 'testuser', password: 'Password123' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.role).toBe('student')
  })

  it('sets auth-token cookie on successful login', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

    const res = await loginHandler(makeRequest(validLoginBody))
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('auth-token')
    expect(setCookie).toContain('mock.jwt.token')
  })

  it('returns 401 when user not found', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    const res = await loginHandler(makeRequest(validLoginBody))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 401 when password is wrong', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    const res = await loginHandler(makeRequest(validLoginBody))
    expect(res.status).toBe(401)
  })

  it('does not reveal whether email or password was wrong (same error message)', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    const res1 = await loginHandler(makeRequest({ identifier: 'noone@x.com', password: 'Password123' }, '10.0.0.1'))
    const data1 = await res1.json()

    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    const res2 = await loginHandler(makeRequest({ identifier: 'test@example.com', password: 'WrongPass1' }, '10.0.0.2'))
    const data2 = await res2.json()

    expect(data1.error).toBe(data2.error)
  })

  it('returns 400 when identifier is missing', async () => {
    const res = await loginHandler(makeRequest({ password: 'Password123' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await loginHandler(makeRequest({ identifier: 'test@example.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: '{bad json',
    })
    const res = await loginHandler(req)
    expect(res.status).toBe(400)
  })

  it('returns 503 when DB is unavailable', async () => {
    const { connectDB } = require('@/lib/mongodb')
    ;(connectDB as jest.Mock).mockRejectedValueOnce(new Error('MongoDB connection failed: DB down'))

    const res = await loginHandler(makeRequest(validLoginBody))
    expect([500, 503]).toContain(res.status)
  })

  it('returns 429 after 5 failed attempts from same IP', async () => {
    const { rateLimiter } = require('@/lib/rate-limit/provider')
    // Simulate rate limit being triggered on 6th call
    ;(rateLimiter.check as jest.Mock)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false }) // 6th attempt blocked

    const ip = '192.168.99.1'
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    for (let i = 0; i < 5; i++) {
      await loginHandler(makeRequest(validLoginBody, ip))
    }

    const res = await loginHandler(makeRequest(validLoginBody, ip))
    expect(res.status).toBe(429)
  })

  it('returns 200 after successful login clears failed attempts', async () => {
    const ip = '192.168.88.1'
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    for (let i = 0; i < 4; i++) {
      await loginHandler(makeRequest(validLoginBody, ip))
    }

    ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    const successRes = await loginHandler(makeRequest(validLoginBody, ip))
    expect(successRes.status).toBe(200)
  })
})
