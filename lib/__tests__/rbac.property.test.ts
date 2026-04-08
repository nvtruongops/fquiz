import fc from 'fast-check'
import { SignJWT } from 'jose'
import { requireRole, verifyToken } from '../auth'
import type { JWTPayload } from '../auth'

jest.mock('../mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('../logger', () => ({
  logSecurityEvent: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
}))
jest.mock('@/models/User', () => ({
  User: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ token_version: 1, status: 'active' }),
      }),
    }),
  },
}))

/**
 * P2: Role-based access control
 * Validates: Requirements 2.3, 3.5, 4.6
 *
 * Requirement 2.3: Only authenticated users with the correct role may access protected resources.
 * Requirement 3.5: Admin endpoints must reject non-admin tokens with 403.
 * Requirement 4.6: Student endpoints must reject non-student tokens with 403.
 */

const JWT_SECRET = 'test-secret-for-rbac-property-tests'
const secret = new TextEncoder().encode(JWT_SECRET)

async function makeToken(role: 'admin' | 'student'): Promise<string> {
  return new SignJWT({ userId: 'user-123', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

function makePayload(role: 'admin' | 'student'): JWTPayload {
  const now = Math.floor(Date.now() / 1000)
  return { userId: 'user-123', role, iat: now, exp: now + 3600 }
}

describe('P2: Role-based access control', () => {
  // Set JWT_SECRET so verifyToken can use it
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET
  })

  afterAll(() => {
    delete process.env.JWT_SECRET
  })

  /**
   * Property 2a: A request with NO token is rejected with 401
   */
  it('verifyToken returns null (→ 401) when no Authorization header is present', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary headers that do NOT include Authorization
        fc.record({
          'Content-Type': fc.constantFrom('application/json', 'text/plain', ''),
          'X-Custom': fc.string({ maxLength: 20 }),
        }),
        async (extraHeaders) => {
          const req = new Request('https://example.com/api/admin', {
            headers: extraHeaders,
          })
          const payload = await verifyToken(req)
          return payload === null
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2b: A request with a token of the WRONG role is rejected with 403
   * - student token accessing admin endpoint → requireRole throws 403
   * - admin token accessing student endpoint → requireRole throws 403
   */
  it('requireRole throws 403 Response when token role does not match required role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('admin' as const, 'student' as const),
        (tokenRole) => {
          // The required role is always the opposite of the token role
          const requiredRole = tokenRole === 'admin' ? 'student' : 'admin'
          const payload = makePayload(tokenRole)

          let threw = false
          let status = 0
          try {
            requireRole(payload, requiredRole)
          } catch (e) {
            threw = true
            if (e instanceof Response) {
              status = e.status
            }
          }

          return threw && status === 403
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2c: A request with a token of the CORRECT role is accepted (not rejected with 401/403)
   */
  it('requireRole does NOT throw when token role matches required role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('admin' as const, 'student' as const),
        (role) => {
          const payload = makePayload(role)

          let threw = false
          try {
            requireRole(payload, role)
          } catch {
            threw = true
          }

          return !threw
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2d: verifyToken returns a valid payload (not null) for a correctly signed token,
   * confirming that a valid token is NOT rejected with 401.
   */
  it('verifyToken returns non-null payload (→ not 401) for a correctly signed token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('admin' as const, 'student' as const),
        async (role) => {
          const token = await makeToken(role)
          const req = new Request('https://example.com/api/resource', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const payload = await verifyToken(req)
          return payload !== null && payload.role === role
        }
      ),
      { numRuns: 100 }
    )
  })
})
