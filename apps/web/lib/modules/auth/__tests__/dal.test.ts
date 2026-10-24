jest.mock('react', () => ({ cache: (fn: Function) => fn }))
jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))
jest.mock('../auth', () => ({ decrypt: jest.fn() }))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('../models/User', () => ({ User: { findById: jest.fn() } }))

import { cookies } from 'next/headers'
import { decrypt } from '../auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '../models/User'
import { verifySession } from '../dal'

describe('Web server-rendered session verification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(undefined)
    ;(cookies as jest.Mock).mockResolvedValue({ get: jest.fn().mockReturnValue({ value: 'token' }) })
    ;(decrypt as jest.Mock).mockResolvedValue({ userId: 'user-1', role: 'teacher', v: 1 })
  })

  test('rejects role, status, or token-version changes before returning the session user', async () => {
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'user-1',
          username: 'learner',
          role: 'student',
          status: 'active',
          token_version: 2,
        }),
      }),
    })

    await expect(verifySession()).resolves.toBeNull()
  })

  test('returns an active user when role and token version match', async () => {
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'user-1',
          username: 'teacher',
          role: 'teacher',
          status: 'active',
          token_version: 1,
          avatar_url: null,
        }),
      }),
    })

    await expect(verifySession()).resolves.toMatchObject({
      userId: 'user-1',
      role: 'teacher',
      status: 'active',
    })
  })
})
