jest.mock('@/lib/auth/with-auth', () => ({
  withAuth: (handler: any) => (request: Request, context: any) =>
    handler(request, { ...context, payload: { userId: 'admin-id', role: 'admin' } }),
}))
jest.mock('@/lib/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/models/User', () => ({
  User: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}))

import { User } from '@/lib/models/User'
import { PUT } from './route'

describe('PUT /api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('increments token_version when a role changes', async () => {
    const id = '507f1f77bcf86cd799439011'
    ;(User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: id,
        role: 'teacher',
        status: 'active',
        token_version: 1,
      }),
    })
    ;(User.findOneAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: id, role: 'student', status: 'active' }),
      }),
    })

    const response = await PUT(
      new Request(`https://admin.example.test/api/users/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'student' }),
      }),
      { params: Promise.resolve({ id }) }
    )

    expect(response.status).toBe(200)
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, role: 'teacher', status: 'active', token_version: 1 },
      { $set: { role: 'student' }, $inc: { token_version: 1 } },
      { new: true }
    )
  })

  test('initializes a missing token_version above the effective legacy default', async () => {
    const id = '507f1f77bcf86cd799439012'
    ;(User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: id,
        role: 'teacher',
        status: 'active',
      }),
    })
    ;(User.findOneAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: id, role: 'student', status: 'active', token_version: 2 }),
      }),
    })

    const response = await PUT(
      new Request(`https://admin.example.test/api/users/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'student' }),
      }),
      { params: Promise.resolve({ id }) }
    )

    expect(response.status).toBe(200)
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, role: 'teacher', status: 'active', token_version: { $exists: false } },
      { $set: { role: 'student', token_version: 2 } },
      { new: true }
    )
  })

  test('increments token_version when an account status changes', async () => {
    const id = '507f1f77bcf86cd799439013'
    ;(User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: id,
        role: 'student',
        status: 'active',
        token_version: 3,
      }),
    })
    ;(User.findOneAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: id, role: 'student', status: 'banned', token_version: 4 }),
      }),
    })

    const response = await PUT(
      new Request(`https://admin.example.test/api/users/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'banned' }),
      }),
      { params: Promise.resolve({ id }) }
    )

    expect(response.status).toBe(200)
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, role: 'student', status: 'active', token_version: 3 },
      { $set: { status: 'banned' }, $inc: { token_version: 1 } },
      { new: true }
    )
  })
})
