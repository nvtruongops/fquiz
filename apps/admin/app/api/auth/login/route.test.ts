jest.mock('@fquiz/auth', () => ({
  ...jest.requireActual('@fquiz/auth'),
  checkRateLimit: jest.fn(() => ({ success: true })),
  verifyPassword: jest.fn(),
}))
jest.mock('@/lib/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/models/User', () => ({ User: { findOne: jest.fn() } }))
jest.mock('@/lib/models/LoginLog', () => ({ LoginLog: { create: jest.fn() } }))
jest.mock('@/lib/auth/auth', () => ({ signAdminToken: jest.fn() }))

import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import { signAdminToken } from '@/lib/auth/auth'
import { verifyPassword } from '@fquiz/auth'
import { POST } from './route'

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(undefined)
  })

  test('does not issue a successful login for a pending-deletion admin', async () => {
    ;(User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: { toString: () => 'admin-id' },
        role: 'admin',
        status: 'pending_deletion',
        password_hash: 'hash',
      }),
    })

    const response = await POST(new Request('https://admin.example.test/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@example.test', password: 'password' }),
    }))

    expect(response.status).toBe(403)
    expect(verifyPassword).not.toHaveBeenCalled()
    expect(signAdminToken).not.toHaveBeenCalled()
  })
})
