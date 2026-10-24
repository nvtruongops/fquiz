import { decrypt, verifyToken, signToken, checkRole, clearUserStatusCache } from '../auth'
import { User } from '../models/User'
import { connectDB } from '@/lib/core/db/mongodb'
import { logSecurityEvent } from '@/lib/core/utils/logger'
import { SignJWT } from 'jose'

// Mock dependencies
jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('../models/User', () => ({
  User: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/core/utils/logger', () => ({
  logSecurityEvent: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
}))

describe('Auth Module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(null)
  })

  describe('JWT signing and decryption', () => {
    it('should sign and successfully decrypt a token', async () => {
      const payload = { userId: 'user-123', role: 'student', v: 1 }
      const token = await signToken(payload.userId, payload.role, payload.v)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      const decrypted = await decrypt(token)
      expect(decrypted).toBeDefined()
      expect(decrypted?.userId).toBe(payload.userId)
      expect(decrypted?.role).toBe(payload.role)
      expect(decrypted?.v).toBe(payload.v)
    })

    it('should return null for invalid token', async () => {
      const decrypted = await decrypt('invalid.token.here')
      expect(decrypted).toBeNull()
    })
  })

  describe('checkRole', () => {
    const payload = { userId: 'user-123', role: 'student', v: 1 }

    it('should return true if role matches in checkRole', () => {
      expect(checkRole(payload, 'student')).toBe(true)
    })

    it('should return false if role does not match in checkRole', () => {
      expect(checkRole(payload, 'admin')).toBe(false)
    })
  })

  describe('verifyToken', () => {
    let mockReq: any

    beforeEach(() => {
      mockReq = {
        headers: {
          get: jest.fn(),
        },
        url: 'http://localhost/api/test',
      }
    })

    it('should extract token from cookie and verify successfully', async () => {
      const payload = { userId: 'user-123', role: 'student', v: 2 }
      const token = await signToken(payload.userId, payload.role, payload.v)

      mockReq.headers.get.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'cookie') {
          return `other-cookie=abc; auth-token=${token}; another=123`
        }
        return null
      })

      // Mock user lookup in db
      const mockUser = {
        _id: 'user-123',
        role: 'student',
        status: 'active',
        token_version: 2,
      }
      ;(User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      })

      const verified = await verifyToken(mockReq)
      expect(verified).toBeDefined()
      expect(verified?.userId).toBe(payload.userId)
      expect(verified?.role).toBe(payload.role)
      expect(verified?.v).toBe(payload.v)
      expect(connectDB).toHaveBeenCalled()
      expect(User.findById).toHaveBeenCalledWith('user-123')
    })

    it('should extract token from Authorization header and verify successfully', async () => {
      const payload = { userId: 'user-456', role: 'admin', v: 1 }
      const token = await signToken(payload.userId, payload.role, payload.v)

      mockReq.headers.get.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return `Bearer ${token}`
        }
        return null
      })

      // Mock user lookup in db
      const mockUser = {
        _id: 'user-456',
        role: 'admin',
        status: 'active',
        token_version: 1,
      }
      ;(User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      })

      const verified = await verifyToken(mockReq)
      expect(verified).toBeDefined()
      expect(verified?.userId).toBe(payload.userId)
      expect(verified?.role).toBe(payload.role)
    })

    it('should fail verification if user is banned', async () => {
      const payload = { userId: 'user-banned', role: 'student', v: 1 }
      const token = await signToken(payload.userId, payload.role, payload.v)

      mockReq.headers.get.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return `Bearer ${token}`
        }
        return null
      })

      // Mock user lookup in db
      const mockUser = {
        _id: 'user-banned',
        role: 'student',
        status: 'banned',
        token_version: 1,
      }
      ;(User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      })

      const verified = await verifyToken(mockReq)
      expect(verified).toBeNull()
      expect(logSecurityEvent).toHaveBeenCalled()
    })

    it('should fail verification if JWT version mismatches user token_version', async () => {
      const payload = { userId: 'user-version-mismatch', role: 'student', v: 1 } // v = 1
      const token = await signToken(payload.userId, payload.role, payload.v)

      mockReq.headers.get.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return `Bearer ${token}`
        }
        return null
      })

      // Mock user lookup in db showing token_version has been incremented (revoked)
      const mockUser = {
        _id: 'user-version-mismatch',
        role: 'student',
        status: 'active',
        token_version: 2, // version in db is 2
      }
      ;(User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      })

      const verified = await verifyToken(mockReq)
      expect(verified).toBeNull()
    })

    it('should reject a token whose role no longer matches the user record', async () => {
      const payload = { userId: 'demoted-user', role: 'teacher', v: 1 }
      const token = await signToken(payload.userId, payload.role, payload.v)
      mockReq.headers.get.mockImplementation((name: string) => (
        name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null
      ))
      ;(User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: payload.userId,
            role: 'student',
            status: 'active',
            token_version: 1,
          }),
        }),
      })

      await expect(verifyToken(mockReq)).resolves.toBeNull()
    })

    it('should reject a versionless legacy token after token_version has been incremented', async () => {
      const payload = { userId: 'versionless-user', role: 'student' }
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET))
      mockReq.headers.get.mockImplementation((name: string) => (
        name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null
      ))
      ;(User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: payload.userId,
            role: 'student',
            status: 'active',
            token_version: 2,
          }),
        }),
      })

      await expect(verifyToken(mockReq)).resolves.toBeNull()
    })

    it('should fail closed in production even when CI and Playwright flags are set', async () => {
      const previousNodeEnv = process.env.NODE_ENV
      const previousCi = process.env.CI
      const previousPlaywrightTest = process.env.PLAYWRIGHT_TEST

      try {
        process.env.NODE_ENV = 'production'
        process.env.CI = 'true'
        process.env.PLAYWRIGHT_TEST = '1'

        const payload = { userId: 'missing-prod-user', role: 'student', v: 1 }
        const token = await signToken(payload.userId, payload.role, payload.v)
        mockReq.headers.get.mockImplementation((name: string) => (
          name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null
        ))

        ;(User.findById as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        })
        await expect(verifyToken(mockReq)).resolves.toBeNull()

        ;(connectDB as jest.Mock).mockRejectedValue(new Error('database unavailable'))
        await expect(verifyToken(mockReq)).resolves.toBeNull()
      } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV
        else process.env.NODE_ENV = previousNodeEnv
        if (previousCi === undefined) delete process.env.CI
        else process.env.CI = previousCi
        if (previousPlaywrightTest === undefined) delete process.env.PLAYWRIGHT_TEST
        else process.env.PLAYWRIGHT_TEST = previousPlaywrightTest
      }
    })

    it('should revalidate role and token version on every production request', async () => {
      const previousNodeEnv = process.env.NODE_ENV
      const previousCi = process.env.CI
      const previousPlaywrightTest = process.env.PLAYWRIGHT_TEST

      try {
        process.env.NODE_ENV = 'production'
        delete process.env.CI
        delete process.env.PLAYWRIGHT_TEST

        const payload = { userId: 'production-role-change', role: 'teacher', v: 1 }
        const token = await signToken(payload.userId, payload.role, payload.v)
        mockReq.headers.get.mockImplementation((name: string) => (
          name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null
        ))

        const queryFor = (user: any) => ({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(user),
          }),
        })
        ;(User.findById as jest.Mock)
          .mockReturnValueOnce(queryFor({ role: 'teacher', status: 'active', token_version: 1 }))
          .mockReturnValueOnce(queryFor({ role: 'student', status: 'active', token_version: 2 }))

        await expect(verifyToken(mockReq)).resolves.toMatchObject({ role: 'teacher' })
        await expect(verifyToken(mockReq)).resolves.toBeNull()
        expect(User.findById).toHaveBeenCalledTimes(2)
      } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV
        else process.env.NODE_ENV = previousNodeEnv
        if (previousCi === undefined) delete process.env.CI
        else process.env.CI = previousCi
        if (previousPlaywrightTest === undefined) delete process.env.PLAYWRIGHT_TEST
        else process.env.PLAYWRIGHT_TEST = previousPlaywrightTest
      }
    })

    it('should utilize cache for checkUserSession status to avoid DB calls', async () => {
      const payload = { userId: 'user-cached', role: 'student', v: 1 }
      const token = await signToken(payload.userId, payload.role, payload.v)

      mockReq.headers.get.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return `Bearer ${token}`
        }
        return null
      })

      const mockUser = {
        _id: 'user-cached',
        role: 'student',
        status: 'active',
        token_version: 1,
      }
      const mockLean = jest.fn().mockResolvedValue(mockUser)
      ;(User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: mockLean,
        }),
      })

      // First call - should call DB
      const verified1 = await verifyToken(mockReq)
      expect(verified1).toBeDefined()
      expect(mockLean).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      const verified2 = await verifyToken(mockReq)
      expect(verified2).toBeDefined()
      expect(mockLean).toHaveBeenCalledTimes(1) // still 1

      // Clear cache for this user
      clearUserStatusCache(payload.userId)

      // Third call - should call DB again
      const verified3 = await verifyToken(mockReq)
      expect(verified3).toBeDefined()
      expect(mockLean).toHaveBeenCalledTimes(2)
    })
  })
})
