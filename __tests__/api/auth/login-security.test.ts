/**
 * Additional security tests for POST /api/auth/login
 * Focuses on: ban enforcement, anti-sharing detection, cookie security flags,
 * regex injection prevention, and rate limiting edge cases.
 *
 * Basic login tests are in lib/__tests__/auth-api.test.ts
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
    findByIdAndUpdate: jest.fn(),
  },
}))
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}))
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn().mockResolvedValue('mock.jwt.token'),
  verifyToken: jest.fn(),
}))
jest.mock('@/models/LoginLog', () => ({
  LoginLog: { create: jest.fn().mockResolvedValue({}) },
  countUniqueDevicesThisWeek: jest.fn(),
}))
jest.mock('@/models/SiteSettings', () => ({
  getSettings: jest.fn(),
}))
jest.mock('@/lib/rate-limit/provider', () => ({
  rateLimiter: {
    check: jest.fn().mockResolvedValue({ success: true }),
  },
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST as loginHandler } from '@/app/api/auth/login/route'
import { User } from '@/models/User'
import bcrypt from 'bcryptjs'
import { countUniqueDevicesThisWeek } from '@/models/LoginLog'
import { getSettings } from '@/models/SiteSettings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, ip = '10.0.0.1'): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

const validBody = { identifier: 'user@example.com', password: 'Password123' }

const activeUser = {
  _id: { toString: () => 'user-id-456' },
  username: 'student1',
  email: 'user@example.com',
  password_hash: 'hashed',
  role: 'student' as const,
  status: 'active' as const,
}

beforeEach(() => jest.clearAllMocks())

// ═════════════════════════════════════════════════════════════════════════════
// Ban enforcement
// ═════════════════════════════════════════════════════════════════════════════

describe('Ban enforcement', () => {
  it('returns 403 when user account is banned', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue({ ...activeUser, status: 'banned' })

    const res = await loginHandler(makeRequest(validBody, '20.0.0.1'))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('does not check password for banned users', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue({ ...activeUser, status: 'banned' })

    await loginHandler(makeRequest(validBody, '20.0.0.2'))
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Anti-sharing detection
// ═════════════════════════════════════════════════════════════════════════════

describe('Anti-sharing detection', () => {
  it('bans user and returns 403 when sharing violations exceed limit', async () => {
    const userWithViolations = { ...activeUser, sharing_violations: 3 }
    ;(User.findOne as jest.Mock).mockResolvedValue(userWithViolations)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(getSettings as jest.Mock).mockResolvedValue({
      anti_sharing_enabled: true,
      anti_sharing_max_violations: 3,
    })
    ;(User.findByIdAndUpdate as jest.Mock).mockResolvedValue({})

    const res = await loginHandler(makeRequest(validBody, '30.0.0.1'))
    expect(res.status).toBe(403)
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      activeUser._id,
      expect.objectContaining({ status: 'banned', ban_reason: 'anti_sharing' })
    )
  })

  it('allows login when violations are below limit', async () => {
    const userWithFewViolations = { ...activeUser, sharing_violations: 2 }
    ;(User.findOne as jest.Mock).mockResolvedValue(userWithFewViolations)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(getSettings as jest.Mock).mockResolvedValue({
      anti_sharing_enabled: true,
      anti_sharing_max_violations: 5,
    })

    const res = await loginHandler(makeRequest(validBody, '30.0.0.2'))
    expect(res.status).toBe(200)
  })

  it('allows login when anti-sharing is disabled', async () => {
    const userWithViolations = { ...activeUser, sharing_violations: 99 }
    ;(User.findOne as jest.Mock).mockResolvedValue(userWithViolations)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(getSettings as jest.Mock).mockResolvedValue({
      anti_sharing_enabled: false,
      anti_sharing_max_violations: 1,
    })

    const res = await loginHandler(makeRequest(validBody, '30.0.0.3'))
    expect(res.status).toBe(200)
  })

  it('does not block login if anti-sharing check throws', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(activeUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(getSettings as jest.Mock).mockRejectedValue(new Error('settings DB error'))

    const res = await loginHandler(makeRequest(validBody, '30.0.0.4'))
    expect(res.status).toBe(200)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Cookie security flags
// ═════════════════════════════════════════════════════════════════════════════

describe('Cookie security flags', () => {
  beforeEach(() => {
    ;(User.findOne as jest.Mock).mockResolvedValue(activeUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(getSettings as jest.Mock).mockResolvedValue({ anti_sharing_enabled: false })
  })

  it('sets HttpOnly flag on auth-token cookie', async () => {
    const res = await loginHandler(makeRequest(validBody, '40.0.0.1'))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie.toLowerCase()).toContain('httponly')
  })

  it('sets SameSite=Strict on auth-token cookie', async () => {
    const res = await loginHandler(makeRequest(validBody, '40.0.0.2'))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie.toLowerCase()).toContain('samesite=strict')
  })

  it('sets Path=/ on auth-token cookie', async () => {
    const res = await loginHandler(makeRequest(validBody, '40.0.0.3'))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('Path=/')
  })

  it('sets MaxAge on auth-token cookie (session expiry)', async () => {
    const res = await loginHandler(makeRequest(validBody, '40.0.0.4'))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie.toLowerCase()).toMatch(/max-age=\d+/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Regex injection prevention
// ═════════════════════════════════════════════════════════════════════════════

describe('Regex injection prevention', () => {
  it('handles username with regex special characters without crashing', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue(null)

    const maliciousUsernames = [
      '.*',
      '^admin$',
      'user[0-9]+',
      'a|b',
      '(admin)',
      'user\\w+',
    ]

    // Use a unique IP per username to avoid triggering rate limiting
    for (let i = 0; i < maliciousUsernames.length; i++) {
      const username = maliciousUsernames[i]
      const ip = `50.0.1.${i + 1}`
      const res = await loginHandler(makeRequest({ identifier: username, password: 'Password123' }, ip))
      // Should return 401 (not found), not 500 (crash)
      expect(res.status).toBe(401)
    }
  })
})
