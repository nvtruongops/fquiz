import { NextRequest } from 'next/server'

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/modules/auth/models/SiteSettings', () => ({
  getSettings: jest.fn().mockResolvedValue({ maintenance_mode: false }),
  clearSettingsCache: jest.fn(),
}))
jest.mock('@/lib/modules/auth/auth', () => ({ verifyToken: jest.fn() }))
jest.mock('@/lib/core/security/rate-limit/sliding-window', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ success: true }),
  createRateLimitErrorResponse: jest.fn(),
  RATE_LIMIT_TIERS: {
    AUTH_STRICT: { keyPrefix: 'auth' },
    AI_GENERATE: { keyPrefix: 'ai' },
    SEARCH_HEAVY: { keyPrefix: 'search' },
    MUTATION_STANDARD: { keyPrefix: 'mutation' },
    QUIZ_SESSION: { keyPrefix: 'session' },
    PUBLIC_READ_AUTH: { keyPrefix: 'read-auth' },
    PUBLIC_READ_GUEST: { keyPrefix: 'read-guest' },
  },
}))

import { verifyToken } from '@/lib/modules/auth/auth'
import { checkRateLimit, RATE_LIMIT_TIERS } from '@/lib/core/security/rate-limit/sliding-window'
import { proxy } from './proxy'

describe('proxy public-read rate limit identity', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not grant the authenticated read tier for an invalid bearer token', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const request = new NextRequest('https://fquiz.online/api/v1/explore/quizzes', {
      headers: { authorization: 'Bearer invalid-token' },
    })

    await proxy(request)

    expect(checkRateLimit).toHaveBeenCalledWith(request, RATE_LIMIT_TIERS.PUBLIC_READ_GUEST)
  })

  it('grants the authenticated read tier only after token verification', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId: 'dummy-user', role: 'student', v: 1 })
    const request = new NextRequest('https://fquiz.online/api/v1/explore/quizzes', {
      headers: { authorization: 'Bearer valid-dummy-token' },
    })

    await proxy(request)

    expect(checkRateLimit).toHaveBeenCalledWith(request, RATE_LIMIT_TIERS.PUBLIC_READ_AUTH)
    expect(verifyToken).toHaveBeenCalledTimes(1)
  })
})
