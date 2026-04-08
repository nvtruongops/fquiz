/**
 * Security tests for proxy.ts
 * Covers route protection, role-based access control, token validation
 *
 * Security properties:
 * - Unauthenticated requests to protected routes are redirected/rejected
 * - Admin routes are inaccessible to students
 * - Student routes are inaccessible to admins
 * - Public routes are accessible without token
 * - Invalid/expired tokens are treated as unauthenticated
 * - API routes return 401/403 JSON (not redirect)
 */

process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-32chars!!'

import { proxy } from '@/proxy'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const secret = new TextEncoder().encode('test-secret-key-for-unit-tests-32chars!!')

async function makeToken(role: 'student' | 'admin', expiresIn = '24h'): Promise<string> {
  return new SignJWT({ userId: 'user-123', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

function makeNextRequest(pathname: string, token?: string, useBearer = false): NextRequest {
  const url = `http://localhost${pathname}`
  const headers: Record<string, string> = {}

  if (token) {
    if (useBearer) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      headers['cookie'] = `auth-token=${token}`
    }
  }

  return new NextRequest(url, { headers })
}

// ═════════════════════════════════════════════════════════════════════════════
// Public routes — no auth required
// ═════════════════════════════════════════════════════════════════════════════

describe('Public routes', () => {
  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/terms', '/privacy', '/explore']

  for (const path of publicPaths) {
    it(`allows unauthenticated access to ${path}`, async () => {
      const req = makeNextRequest(path)
      const res = await proxy(req)
      // Should not redirect to login
      expect(res.status).not.toBe(401)
      if (res.status === 307 || res.status === 308) {
        expect(res.headers.get('location')).not.toContain('/login')
      }
    })
  }

  it('allows unauthenticated access to /quiz/[id] (public quiz detail)', async () => {
    const req = makeNextRequest('/quiz/abc123')
    const res = await proxy(req)
    expect(res.status).not.toBe(401)
  })

  it('allows unauthenticated access to /api/auth/ routes', async () => {
    const req = makeNextRequest('/api/auth/login')
    const res = await proxy(req)
    expect(res.status).not.toBe(401)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Protected routes — unauthenticated
// ═════════════════════════════════════════════════════════════════════════════

describe('Protected routes — no token', () => {
  it('redirects unauthenticated user from /dashboard to /login', async () => {
    const req = makeNextRequest('/dashboard')
    const res = await proxy(req)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('returns 401 JSON for unauthenticated API request to /api/sessions', async () => {
    const req = makeNextRequest('/api/sessions')
    const res = await proxy(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 401 JSON for unauthenticated request to /api/admin/users', async () => {
    const req = makeNextRequest('/api/admin/users')
    const res = await proxy(req)
    expect(res.status).toBe(401)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Role-based access control
// ═════════════════════════════════════════════════════════════════════════════

describe('Role-based access control', () => {
  it('allows student to access /dashboard', async () => {
    const token = await makeToken('student')
    const req = makeNextRequest('/dashboard', token)
    const res = await proxy(req)
    // Should pass through (not redirect to login, not 401/403)
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
    if (res.status >= 300 && res.status < 400) {
      expect(res.headers.get('location')).not.toContain('/login')
    }
  })

  it('redirects student away from /admin page', async () => {
    const token = await makeToken('student')
    const req = makeNextRequest('/admin', token)
    const res = await proxy(req)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('allows admin to access /admin page', async () => {
    const token = await makeToken('admin')
    const req = makeNextRequest('/admin', token)
    const res = await proxy(req)
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
    if (res.status >= 300 && res.status < 400) {
      expect(res.headers.get('location')).not.toContain('/login')
    }
  })

  it('redirects admin away from /dashboard (student route)', async () => {
    const token = await makeToken('admin')
    const req = makeNextRequest('/dashboard', token)
    const res = await proxy(req)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/admin')
  })

  it('returns 403 when student accesses /api/admin route', async () => {
    const token = await makeToken('student')
    const req = makeNextRequest('/api/admin/users', token)
    const res = await proxy(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('allows admin to access /api/admin route', async () => {
    const token = await makeToken('admin')
    const req = makeNextRequest('/api/admin/users', token)
    const res = await proxy(req)
    // Should pass through
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Invalid / expired tokens
// ═════════════════════════════════════════════════════════════════════════════

describe('Invalid or expired tokens', () => {
  it('returns 401 for API request with invalid token', async () => {
    const req = makeNextRequest('/api/sessions', 'not.a.valid.jwt')
    const res = await proxy(req)
    expect(res.status).toBe(401)
  })

  it('redirects page request with invalid token to /login', async () => {
    const req = makeNextRequest('/dashboard', 'not.a.valid.jwt')
    const res = await proxy(req)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('returns 401 for API request with expired token', async () => {
    // Create a token that expired 1 second ago using numeric timestamp
    const { SignJWT } = await import('jose')
    const expiredToken = await new SignJWT({ userId: 'user-123', role: 'student' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1) // expired 1s ago
      .sign(secret)

    const req = makeNextRequest('/api/sessions', expiredToken)
    const res = await proxy(req)
    expect(res.status).toBe(401)
  })

  it('includes callbackUrl in redirect for unauthenticated page request', async () => {
    const req = makeNextRequest('/dashboard')
    const res = await proxy(req)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('callbackUrl')
  })
})
