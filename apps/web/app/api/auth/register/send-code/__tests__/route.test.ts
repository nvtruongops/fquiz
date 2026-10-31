const mockFindOneAndUpdate = jest.fn()
const mockEnqueueMail = jest.fn().mockResolvedValue(undefined)
const mockUserFindOne = jest.fn()
const mockVerificationFindOne = jest.fn()

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { findOne: (...args: unknown[]) => mockUserFindOne(...args) } }))
jest.mock('@/lib/modules/auth/models/EmailVerification', () => ({
  EmailVerification: {
    findOne: (...args: unknown[]) => mockVerificationFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}))
jest.mock('@/lib/core/security/rate-limit/provider', () => ({ rateLimiter: { check: jest.fn().mockResolvedValue({ success: true }) } }))
jest.mock('@/lib/core/security/request-metadata', () => ({
  getRequestMetadata: jest.fn(() => ({ requestId: 'request-1', ip: '127.0.0.1', route: '/api/auth/register/send-code' })),
}))
jest.mock('@/lib/core/utils/logger', () => ({ logSecurityEvent: jest.fn() }))
jest.mock('@/lib/core/mail/mail', () => ({ isMailConfigured: () => true, enqueueMail: (...args: unknown[]) => mockEnqueueMail(...args) }))

import { POST } from '../route'

describe('POST /api/auth/register/send-code resend cooldown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-only-register-secret'
    mockUserFindOne.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) })
    mockVerificationFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })

    let accepted = false
    mockFindOneAndUpdate.mockImplementation(async (filter: any) => {
      expect(filter.$or).toEqual(expect.arrayContaining([
        { resend_available_at: { $exists: false } },
        { resend_available_at: null },
      ]))
      if (accepted) throw Object.assign(new Error('duplicate key'), { code: 11000 })
      accepted = true
      return { _id: 'verification-1' }
    })
  })

  it('uses a conditional upsert and sends only one code for concurrent requests', async () => {
    const send = () => POST(new Request('https://fquiz.test/api/auth/register/send-code', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'new-student@example.test' }),
    }))

    const responses = await Promise.all([send(), send()])

    expect(responses.map((response) => response.status).sort()).toEqual([200, 429])
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(2)
    expect(mockEnqueueMail).toHaveBeenCalledTimes(1)
  })
})
