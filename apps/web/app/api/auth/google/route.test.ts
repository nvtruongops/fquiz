jest.mock('@fquiz/auth', () => ({ getClientIp: jest.fn(() => '127.0.0.1') }))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/auth', () => ({ signToken: jest.fn() }))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { findOne: jest.fn() } }))
jest.mock('@/lib/modules/auth/models/LoginLog', () => ({ LoginLog: { create: jest.fn() } }))
jest.mock('@/lib/core/security/rate-limit/provider', () => ({
  rateLimiter: { check: jest.fn().mockResolvedValue({ success: true }) },
}))
jest.mock('@/lib/core/utils/logger', () => ({ logSecurityEvent: jest.fn() }))

import { POST } from './route'
import { signToken } from '@/lib/modules/auth/auth'
import { User } from '@/lib/modules/auth/models/User'
import { LoginLog } from '@/lib/modules/auth/models/LoginLog'

describe('POST /api/auth/google redirect origin', () => {
  const originalAppUrl = process.env.APP_URL
  const originalGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.APP_URL = 'https://fquiz.online'
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'fquiz-test-client.apps.googleusercontent.com'
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(() => {
    if (originalAppUrl === undefined) delete process.env.APP_URL
    else process.env.APP_URL = originalAppUrl
    if (originalGoogleClientId === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    else process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalGoogleClientId
  })

  test('redirects form submissions to the configured public origin, not the internal request URL', async () => {
    process.env.APP_URL = 'https://fquiz.online'
    const body = new FormData()
    body.set('credential', '')

    const response = await POST(new Request('https://localhost:3000/api/auth/google', {
      method: 'POST',
      body,
    }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://fquiz.online/login?reason=google_auth_failed&error=Invalid+Google+credential')
  })

  test('fails closed in production when no canonical origin is configured', async () => {
    const urlEnvNames = ['APP_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'VERCEL_URL'] as const
    const priorValues = urlEnvNames.map((name) => process.env[name])
    const priorNodeEnv = process.env.NODE_ENV
    urlEnvNames.forEach((name) => delete process.env[name])
    process.env.NODE_ENV = 'production'

    try {
      const body = new FormData()
      body.set('credential', '')
      const response = await POST(new Request('https://attacker.example/api/auth/google', {
        method: 'POST',
        headers: { host: 'attacker.example', 'x-forwarded-host': 'attacker.example' },
        body,
      }))

      expect(response.status).toBe(500)
      expect(response.headers.get('location')).toBeNull()
      expect(User.findOne).not.toHaveBeenCalled()
      expect(signToken).not.toHaveBeenCalled()
    } finally {
      urlEnvNames.forEach((name, index) => {
        if (priorValues[index] === undefined) delete process.env[name]
        else process.env[name] = priorValues[index]
      })
      if (priorNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = priorNodeEnv
    }
  })

  test('redirects successful Google form sign-ins to the dashboard on the configured public origin', async () => {
    process.env.APP_URL = 'https://fquiz.online'
    const user = {
      _id: { toString: () => 'user-1' },
      username: 'learner',
      role: 'student',
      status: 'active',
      token_version: 1,
    }
    ;(User.findOne as jest.Mock).mockResolvedValue(user)
    ;(LoginLog.create as jest.Mock).mockResolvedValue(undefined)
    ;(signToken as jest.Mock).mockResolvedValue('signed-token')
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      iss: 'accounts.google.com',
      aud: 'fquiz-test-client.apps.googleusercontent.com',
      email_verified: true,
      email: 'learner@example.com',
      sub: 'google-user-1',
    }), { status: 200 }))

    const body = new FormData()
    body.set('credential', 'valid-test-token')
    const response = await POST(new Request('https://localhost:3000/api/auth/google', {
      method: 'POST',
      body,
    }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://fquiz.online/dashboard')
    expect(response.headers.get('set-cookie')).toContain('auth-token=signed-token')
  })

  test('rejects a Google token issued to another client before user lookup or token signing', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      iss: 'accounts.google.com',
      aud: 'another-client.apps.googleusercontent.com',
      email_verified: true,
      email: 'learner@example.com',
      sub: 'google-user-1',
    }), { status: 200 }))

    const response = await POST(new Request('https://localhost:3000/api/auth/google', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential: 'wrong-audience-token' }),
    }))

    expect(response.status).toBe(401)
    expect(User.findOne).not.toHaveBeenCalled()
    expect(signToken).not.toHaveBeenCalled()
  })

  test('keeps a backslash callback on the configured origin', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'user-1' },
      username: 'learner',
      role: 'student',
      status: 'active',
      token_version: 1,
    })
    ;(LoginLog.create as jest.Mock).mockResolvedValue(undefined)
    ;(signToken as jest.Mock).mockResolvedValue('signed-token')
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      iss: 'accounts.google.com',
      aud: 'fquiz-test-client.apps.googleusercontent.com',
      email_verified: true,
      email: 'learner@example.com',
      sub: 'google-user-1',
    }), { status: 200 }))

    const body = new FormData()
    body.set('credential', 'valid-test-token')
    const response = await POST(new Request('https://localhost:3000/api/auth/google?callbackUrl=%2F%5C%5Cattacker.invalid', {
      method: 'POST',
      body,
    }))

    expect(response.status).toBe(303)
    expect(new URL(response.headers.get('location')!).origin).toBe('https://fquiz.online')
    expect(response.headers.get('location')).toBe('https://fquiz.online/dashboard')
  })

  test('preserves a same-origin callback path after successful sign-in', async () => {
    ;(User.findOne as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'user-1' },
      username: 'learner',
      role: 'student',
      status: 'active',
      token_version: 1,
    })
    ;(LoginLog.create as jest.Mock).mockResolvedValue(undefined)
    ;(signToken as jest.Mock).mockResolvedValue('signed-token')
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      iss: 'accounts.google.com',
      aud: 'fquiz-test-client.apps.googleusercontent.com',
      email_verified: true,
      email: 'learner@example.com',
      sub: 'google-user-1',
    }), { status: 200 }))

    const body = new FormData()
    body.set('credential', 'valid-test-token')
    const response = await POST(new Request('https://localhost:3000/api/auth/google?callbackUrl=%2Fsettings%2Fprofile', {
      method: 'POST',
      body,
    }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://fquiz.online/settings/profile')
  })
})
