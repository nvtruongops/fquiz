import { decrypt, verifyToken, signToken, checkRole, requireRole, clearUserStatusCache, clearAllUserStatusCache } from '../auth'
import { User } from '../models/User'
import { connectDB } from '@/lib/core/db/mongodb'
import { logSecurityEvent } from '@/lib/core/utils/logger'

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
    clearAllUserStatusCache()
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

  describe('checkRole and requireRole', () => {
    const payload = { userId: 'user-123', role: 'student', v: 1 }

    it('should return true if role matches in checkRole', () => {
      expect(checkRole(payload, 'student')).toBe(true)
    })

    it('should return false if role does not match in checkRole', () => {
      expect(checkRole(payload, 'admin')).toBe(false)
    })

    it('should not throw if role matches in requireRole', () => {
      expect(() => requireRole(payload, 'student')).not.toThrow()
    })

    it('should throw Response with 403 status if role does not match in requireRole', () => {
      expect(() => requireRole(payload, 'admin')).toThrow()
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
      const payload = { userId: 'user-123', role: 'student', v: 1 } // v = 1
      const token = await signToken(payload.userId, payload.role, payload.v)

      mockReq.headers.get.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return `Bearer ${token}`
        }
        return null
      })

      // Mock user lookup in db showing token_version has been incremented (revoked)
      const mockUser = {
        _id: 'user-123',
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
