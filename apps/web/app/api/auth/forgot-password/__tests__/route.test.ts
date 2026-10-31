const mockUpdateOne = jest.fn()
const mockEnqueueMail = jest.fn().mockResolvedValue(undefined)
const user = {
  _id: { toString: () => 'user-1' },
  email: 'student@example.test',
  reset_token_expires: null as Date | null,
}

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/modules/auth/models/User', () => ({
  User: { findOne: jest.fn(), updateOne: (...args: unknown[]) => mockUpdateOne(...args) },
}))
jest.mock('@/lib/core/security/rate-limit/provider', () => ({ rateLimiter: { check: jest.fn().mockResolvedValue({ success: true }) } }))
jest.mock('@/lib/core/security/request-metadata', () => ({
  getRequestMetadata: jest.fn(() => ({ requestId: 'request-1', ip: '127.0.0.1', route: '/api/auth/forgot-password' })),
}))
jest.mock('@/lib/core/utils/logger', () => ({ logSecurityEvent: jest.fn() }))
jest.mock('@/lib/core/mail/mail', () => ({ isMailConfigured: () => true, enqueueMail: (...args: unknown[]) => mockEnqueueMail(...args) }))
jest.mock('@/lib/modules/auth/reset-token-attempts', () => ({ incrementFailedResetTokenAttempts: jest.fn() }))

import { POST } from '../route'
import { User } from '@/lib/modules/auth/models/User'

describe('POST /api/auth/forgot-password resend cooldown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-only-reset-secret'
    user.reset_token_expires = null
    let findCount = 0
    let releaseReads!: () => void
    const readsReady = new Promise<void>((resolve) => { releaseReads = resolve })
    ;(User.findOne as jest.Mock).mockImplementation(async () => {
      findCount += 1
      if (findCount === 2) releaseReads()
      await readsReady
      return { ...user, reset_token_expires: null }
    })

    let accepted = false
    mockUpdateOne.mockImplementation(async (filter: any, update: any) => {
      expect(filter.$or).toEqual(expect.arrayContaining([
        { reset_token_expires: { $exists: false } },
        { reset_token_expires: null },
      ]))
      if (accepted) return { matchedCount: 0 }
      accepted = true
      user.reset_token_expires = update.$set.reset_token_expires
      return { matchedCount: 1 }
    })
  })

  it('atomically accepts one of two concurrent sends and enqueues one email', async () => {
    const send = () => POST(new Request('https://fquiz.test/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    }))

    const responses = await Promise.all([send(), send()])

    expect(responses.map((response) => response.status)).toEqual([200, 200])
    expect(mockUpdateOne).toHaveBeenCalledTimes(2)
    expect(mockEnqueueMail).toHaveBeenCalledTimes(1)
  })
})
