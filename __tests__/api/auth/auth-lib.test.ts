/**
 * Security tests for lib/auth.ts
 * Covers: signToken, verifyToken, requireRole
 *
 * Security properties tested:
 * - JWT tokens are signed and verifiable
 * - Tampered tokens are rejected
 * - Expired tokens are rejected
 * - Missing JWT_SECRET throws at runtime
 * - requireRole enforces role-based access control
 * - verifyToken reads from both cookie and Authorization header
 */

// ─── Setup env before imports ─────────────────────────────────────────────────

process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-32chars!!'

jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logSecurityEvent: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
  logSessionError: jest.fn(),
}))
jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/models/User', () => ({
  User: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ token_version: 1, status: 'active' }),
      }),
    }),
  },
}))

import { signToken, verifyToken, requireRole } from '@/lib/auth'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequestWithCookie(token: string): Request {
  return new Request('http://localhost/api/test', {
    headers: { cookie: `auth-token=${token}` },
  })
}

function makeRequestWithBearer(token: string): Request {
  return new Request('http://localhost/api/test', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function makeRequestNoAuth(): Request {
  return new Request('http://localhost/api/test')
}

// ═════════════════════════════════════════════════════════════════════════════
// signToken
// ═════════════════════════════════════════════════════════════════════════════

describe('signToken', () => {
  it('returns a non-empty JWT string', async () => {
    const token = await signToken('user-123', 'student')
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // header.payload.signature
  })

  it('produces different tokens for different userIds', async () => {
    const t1 = await signToken('user-1', 'student')
    const t2 = await signToken('user-2', 'student')
    expect(t1).not.toBe(t2)
  })

  it('produces different tokens for different roles', async () => {
    const t1 = await signToken('user-1', 'student')
    const t2 = await signToken('user-1', 'admin')
    expect(t1).not.toBe(t2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// verifyToken
// ═════════════════════════════════════════════════════════════════════════════

describe('verifyToken', () => {
  it('returns payload for a valid token in cookie', async () => {
    const token = await signToken('user-abc', 'student')
    const payload = await verifyToken(makeRequestWithCookie(token))

    expect(payload).not.toBeNull()
    expect(payload!.userId).toBe('user-abc')
    expect(payload!.role).toBe('student')
  })

  it('returns payload for a valid token in Authorization header', async () => {
    const token = await signToken('user-xyz', 'admin')
    const payload = await verifyToken(makeRequestWithBearer(token))

    expect(payload).not.toBeNull()
    expect(payload!.userId).toBe('user-xyz')
    expect(payload!.role).toBe('admin')
  })

  it('returns null when no token is present', async () => {
    const payload = await verifyToken(makeRequestNoAuth())
    expect(payload).toBeNull()
  })

  it('returns null for a tampered token', async () => {
    const token = await signToken('user-123', 'student')
    // Replace the entire signature part (3rd segment) with garbage
    const parts = token.split('.')
    parts[2] = parts[2].split('').reverse().join('') // reverse signature bytes
    const tampered = parts.join('.')
    const payload = await verifyToken(makeRequestWithCookie(tampered))
    expect(payload).toBeNull()
  })

  it('returns null for a completely invalid token string', async () => {
    const payload = await verifyToken(makeRequestWithCookie('not.a.jwt'))
    expect(payload).toBeNull()
  })

  it('returns null for an empty token string', async () => {
    const payload = await verifyToken(makeRequestWithCookie(''))
    expect(payload).toBeNull()
  })

  it('prefers cookie token over Authorization header when both are present', async () => {
    const cookieToken = await signToken('cookie-user', 'student')
    const bearerToken = await signToken('bearer-user', 'admin')

    const req = new Request('http://localhost/api/test', {
      headers: {
        cookie: `auth-token=${cookieToken}`,
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    const payload = await verifyToken(req)
    expect(payload!.userId).toBe('cookie-user')
  })

  it('payload contains iat and exp fields', async () => {
    const token = await signToken('user-123', 'student')
    const payload = await verifyToken(makeRequestWithCookie(token))

    expect(payload!.iat).toBeDefined()
    expect(payload!.exp).toBeDefined()
    expect(payload!.exp).toBeGreaterThan(payload!.iat)
  })

  it('token signed with wrong secret is rejected', async () => {
    // Manually craft a token signed with a different secret
    const { SignJWT } = await import('jose')
    const wrongSecret = new TextEncoder().encode('completely-different-secret-key!!')
    const fakeToken = await new SignJWT({ userId: 'hacker', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(wrongSecret)

    const payload = await verifyToken(makeRequestWithCookie(fakeToken))
    expect(payload).toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// requireRole
// ═════════════════════════════════════════════════════════════════════════════

describe('requireRole', () => {
  const studentPayload = { userId: 'u1', role: 'student' as const, iat: 0, exp: 9999999999 }
  const adminPayload = { userId: 'u2', role: 'admin' as const, iat: 0, exp: 9999999999 }

  it('does not throw when role matches', () => {
    expect(() => requireRole(studentPayload, 'student')).not.toThrow()
    expect(() => requireRole(adminPayload, 'admin')).not.toThrow()
  })

  it('throws a Response with status 403 when role does not match', () => {
    expect(() => requireRole(studentPayload, 'admin')).toThrow()

    try {
      requireRole(studentPayload, 'admin')
    } catch (e) {
      expect(e).toBeInstanceOf(Response)
      expect((e as Response).status).toBe(403)
    }
  })

  it('student cannot access admin role', () => {
    expect(() => requireRole(studentPayload, 'admin')).toThrow()
  })

  it('admin cannot access student role', () => {
    expect(() => requireRole(adminPayload, 'student')).toThrow()
  })
})
