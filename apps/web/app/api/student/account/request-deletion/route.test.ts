jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: (request: Request, context: any) => unknown) =>
    (request: Request) => handler(request, { payload: { userId: '507f1f77bcf86cd799439011' } }),
}))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { findById: jest.fn() } }))
jest.mock('@/lib/modules/auth/auth', () => ({ clearUserStatusCache: jest.fn() }))
jest.mock('@/lib/core/mail/mail', () => ({ enqueueMail: jest.fn() }))
jest.mock('bcryptjs', () => ({ compare: jest.fn() }))

import { POST } from './route'
import { User } from '@/lib/modules/auth/models/User'
import { enqueueMail } from '@/lib/core/mail/mail'
import bcrypt from 'bcryptjs'

describe('POST /api/student/account/request-deletion canonical recovery URL', () => {
  const urlEnvNames = ['APP_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'VERCEL_URL'] as const
  const originalUrls = urlEnvNames.map((name) => process.env[name])
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    urlEnvNames.forEach((name, index) => {
      if (originalUrls[index] === undefined) delete process.env[name]
      else process.env[name] = originalUrls[index]
    })
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  test('builds restore links only from the configured origin', async () => {
    process.env.NODE_ENV = 'production'
    process.env.APP_URL = 'https://fquiz.online'
    const user = {
      status: 'active',
      password_hash: 'hash',
      email: 'student@example.test',
      username: 'student',
      save: jest.fn().mockResolvedValue(undefined),
    }
    ;(User.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(user) })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(enqueueMail as jest.Mock).mockResolvedValue(undefined)

    const response = await POST(new Request('https://attacker.example/api/student/account/request-deletion', {
      method: 'POST',
      headers: { host: 'attacker.example', 'x-forwarded-host': 'attacker.example', 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'correct-password' }),
    })) as Response

    expect(response.status).toBe(200)
    const mail = (enqueueMail as jest.Mock).mock.calls[0][1]
    expect(mail.restoreUrl).toMatch(/^https:\/\/fquiz\.online\/restore-account\?token=/)
    expect(mail.restoreUrl).not.toContain('attacker.example')
  })

  test('fails closed in production when no configured origin exists', async () => {
    process.env.NODE_ENV = 'production'
    urlEnvNames.forEach((name) => delete process.env[name])

    const response = await POST(new Request('https://attacker.example/api/student/account/request-deletion', {
      method: 'POST',
      headers: { host: 'attacker.example', 'x-forwarded-host': 'attacker.example' },
      body: JSON.stringify({ password: 'correct-password' }),
    })) as Response

    expect(response.status).toBe(500)
    expect(User.findById).not.toHaveBeenCalled()
    expect(enqueueMail).not.toHaveBeenCalled()
  })
})
