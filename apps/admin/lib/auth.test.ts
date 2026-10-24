jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))
jest.mock('@/lib/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/models/User', () => ({ User: { findById: jest.fn() } }))
jest.mock('@fquiz/auth', () => ({
  AUTH_COOKIE_NAME: 'auth-token',
  CSRF_COOKIE_NAME: 'csrf-token',
  CSRF_HEADER_NAME: 'x-csrf-token',
  JWT_EXPIRY: '7d',
  MAINTENANCE_COOKIE_NAME: 'maintenance-mode',
  SignJWT: jest.fn(),
  decrypt: jest.fn(),
}))

import { cookies } from 'next/headers'
import { decrypt } from '@fquiz/auth'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import { getCurrentAdmin } from './auth/dal'
import { isActiveAdminToken, verifyAdminToken } from './auth/auth'

describe('Admin token revocation', () => {
  const payload = { userId: 'admin-id', role: 'admin', v: 1 }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(undefined)
  })

  test('rejects a token whose version predates the database version', async () => {
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        role: 'admin',
        status: 'active',
        token_version: 2,
      }),
    })

    await expect(isActiveAdminToken(payload)).resolves.toBe(false)
  })

  test('rejects an admin account that is not active', async () => {
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        role: 'admin',
        status: 'pending_deletion',
        token_version: 1,
      }),
    })

    await expect(isActiveAdminToken(payload)).resolves.toBe(false)
  })

  test('accepts an active admin token with the current version', async () => {
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        role: 'admin',
        status: 'active',
        token_version: 1,
      }),
    })

    await expect(isActiveAdminToken(payload)).resolves.toBe(true)
  })

  test('fails closed if the database cannot validate the token', async () => {
    ;(connectDB as jest.Mock).mockRejectedValue(new Error('database unavailable'))

    await expect(isActiveAdminToken(payload)).resolves.toBe(false)
  })

  test('does not trust client-supplied admin identity headers', async () => {
    const request = new Request('https://admin.example.test/api/users', {
      headers: {
        'x-admin-id': 'admin-id',
        'x-admin-role': 'admin',
      },
    })

    await expect(verifyAdminToken(request)).resolves.toBeNull()
    expect(User.findById).not.toHaveBeenCalled()
  })

  test('rejects a signed admin token after its database version is revoked', async () => {
    ;(decrypt as jest.Mock).mockResolvedValue(payload)
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        role: 'admin',
        status: 'active',
        token_version: 2,
      }),
    })
    const request = new Request('https://admin.example.test/api/users', {
      headers: { cookie: 'auth-token=signed-token' },
    })

    await expect(verifyAdminToken(request)).resolves.toBeNull()
  })

  test('server-rendered admin access rejects a stale token', async () => {
    ;(cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'stale-token' }),
    })
    ;(decrypt as jest.Mock).mockResolvedValue(payload)
    ;(User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        role: 'admin',
        status: 'active',
        token_version: 2,
      }),
    })

    await expect(getCurrentAdmin()).resolves.toBeNull()
  })
})
