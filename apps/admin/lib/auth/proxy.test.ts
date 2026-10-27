jest.mock('@fquiz/auth', () => ({
  ...jest.requireActual('@fquiz/auth'),
  decrypt: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { decrypt } from '@fquiz/auth'
import { proxy } from '../../proxy'

describe('Admin proxy security gates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('redirects Vercel aliases using the configured admin URL', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalAdminUrl = process.env.NEXT_PUBLIC_ADMIN_URL
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_ADMIN_URL = 'https://admin.example.test/login'

    try {
      const request = new NextRequest('https://preview.vercel.app/login?next=%2Fusers')
      const response = await proxy(request)

      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe('https://admin.example.test/login?next=%2Fusers')
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = originalNodeEnv
      if (originalAdminUrl === undefined) delete process.env.NEXT_PUBLIC_ADMIN_URL
      else process.env.NEXT_PUBLIC_ADMIN_URL = originalAdminUrl
    }
  })

  test('rejects unsafe requests from a different origin, including public login', async () => {
    const request = new NextRequest('https://admin.example.test/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'admin.example.test',
        origin: 'https://attacker.example.test',
        'x-forwarded-proto': 'https',
        cookie: 'csrf-token=csrf-value',
        'x-csrf-token': 'csrf-value',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
    expect(decrypt).not.toHaveBeenCalled()
  })

  test('allows a same-origin public login request', async () => {
    const request = new NextRequest('https://admin.example.test/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'admin.example.test',
        origin: 'https://admin.example.test',
        'x-forwarded-proto': 'https',
        cookie: 'csrf-token=csrf-value',
        'x-csrf-token': 'csrf-value',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(decrypt).not.toHaveBeenCalled()
  })

  test('rejects same-origin cookie mutations without a matching CSRF token', async () => {
    const request = new NextRequest('https://admin.example.test/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'admin.example.test',
        origin: 'https://admin.example.test',
        'x-forwarded-proto': 'https',
        cookie: 'csrf-token=csrf-value',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
  })

  test('rejects a same-origin request when the CSRF cookie and header differ', async () => {
    const request = new NextRequest('https://admin.example.test/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'admin.example.test',
        origin: 'https://admin.example.test',
        'x-forwarded-proto': 'https',
        cookie: 'csrf-token=expected-token',
        'x-csrf-token': 'different-token',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
  })

  test('passes a signed admin request to route-level freshness checks', async () => {
    ;(decrypt as jest.Mock).mockResolvedValue({ userId: 'admin-id', role: 'admin', v: 1 })
    const request = new NextRequest('https://admin.example.test/api/users', {
      headers: { cookie: 'auth-token=stale-token' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(decrypt).toHaveBeenCalledWith('stale-token')
  })

  test('does not trust client-supplied admin identity headers without a token', async () => {
    const request = new NextRequest('https://admin.example.test/api/users', {
      headers: {
        'x-admin-id': 'admin-id',
        'x-admin-role': 'admin',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(401)
  })

  test('does not expose quiz-code metadata through the public proxy paths', async () => {
    const request = new NextRequest('https://admin.example.test/api/quizzes/check-code?code=private-course')

    const response = await proxy(request)

    expect(response.status).toBe(401)
  })

  test('rejects unsafe requests without Origin, Referer, or a CSRF token pair', async () => {
    const request = new NextRequest('https://admin.example.test/api/users', {
      method: 'DELETE',
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
  })

  test('accepts a matching double-submit token when Origin and Referer are absent', async () => {
    ;(decrypt as jest.Mock).mockResolvedValue({ userId: 'admin-id', role: 'admin', v: 1 })
    const request = new NextRequest('https://admin.example.test/api/users', {
      method: 'POST',
      headers: {
        host: 'admin.example.test',
        'x-forwarded-proto': 'https',
        cookie: 'auth-token=valid-token; csrf-token=csrf-value',
        'x-csrf-token': 'csrf-value',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(decrypt).toHaveBeenCalledWith('valid-token')
  })

  test('sets a readable CSRF cookie when serving the login page', async () => {
    const request = new NextRequest('https://admin.example.test/login')

    const response = await proxy(request)

    expect(response.cookies.get('csrf-token')?.value).toHaveLength(36)
  })

  test('allows a valid Bearer-only mutation without browser CSRF headers', async () => {
    ;(decrypt as jest.Mock).mockResolvedValue({ userId: 'admin-id', role: 'admin', v: 1 })
    const request = new NextRequest('https://admin.example.test/api/users', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(decrypt).toHaveBeenCalledWith('valid-token')
  })

  test('preserves Bearer-only logout requests without a CSRF cookie', async () => {
    const request = new NextRequest('https://admin.example.test/api/auth/logout', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(decrypt).not.toHaveBeenCalled()
  })
})
