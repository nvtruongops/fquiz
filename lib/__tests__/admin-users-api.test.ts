/**
 * Unit tests for Admin Users API routes
 * Coverage: GET list, PUT update, DELETE single, POST bulk
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logSecurityEvent: jest.fn(),
  logRateLimitTriggered: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
  logSessionError: jest.fn(),
}))
jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
  requireRole: jest.fn(),
}))
jest.mock('@/models/User', () => ({
  User: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  },
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET as getUsersHandler } from '@/app/api/admin/users/route'
import { PUT as putUserHandler, DELETE as deleteUserHandler } from '@/app/api/admin/users/[id]/route'
import { POST as bulkUsersHandler } from '@/app/api/admin/users/bulk/route'

import { verifyToken, requireRole } from '@/lib/auth'
import { User } from '@/models/User'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockAdminPayload = { userId: 'admin-user-id', role: 'admin' as const, iat: 0, exp: 9999999999 }

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeParams(id: string) {
  return { params: { id } }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  ;(verifyToken as jest.Mock).mockResolvedValue(mockAdminPayload)
  ;(requireRole as jest.Mock).mockReturnValue(undefined)
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/admin/users
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/users', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest('GET', 'http://localhost/api/admin/users')
    const res = await getUsersHandler(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not admin', async () => {
    ;(requireRole as jest.Mock).mockImplementation(() => {
      throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    })
    const req = makeRequest('GET', 'http://localhost/api/admin/users')
    const res = await getUsersHandler(req)
    expect(res.status).toBe(403)
  })

  it('returns paginated users with 200', async () => {
    const mockUsers = [
      { _id: 'u1', username: 'user1', email: 'a@a.com', role: 'student', status: 'active' },
    ]
    ;(User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockUsers),
            }),
          }),
        }),
      }),
    })
    ;(User.countDocuments as jest.Mock).mockResolvedValue(1)

    const req = makeRequest('GET', 'http://localhost/api/admin/users?page=1&limit=10')
    const res = await getUsersHandler(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.users).toEqual(mockUsers)
    expect(data.total).toBe(1)
    expect(data.page).toBe(1)
    expect(data.totalPages).toBe(1)
  })

  it('applies search filter when search length >= 2', async () => {
    ;(User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })
    ;(User.countDocuments as jest.Mock).mockResolvedValue(0)

    const req = makeRequest('GET', 'http://localhost/api/admin/users?search=ab')
    const res = await getUsersHandler(req)
    expect(res.status).toBe(200)
    // Verify User.find was called with $or filter
    const findCall = (User.find as jest.Mock).mock.calls[0][0]
    expect(findCall.$or).toBeDefined()
    expect(findCall.$or).toHaveLength(2)
  })

  it('applies role filter', async () => {
    ;(User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })
    ;(User.countDocuments as jest.Mock).mockResolvedValue(0)

    const req = makeRequest('GET', 'http://localhost/api/admin/users?role=student')
    const res = await getUsersHandler(req)
    expect(res.status).toBe(200)
    const findCall = (User.find as jest.Mock).mock.calls[0][0]
    expect(findCall.role).toBe('student')
  })

  it('applies status filter', async () => {
    ;(User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })
    ;(User.countDocuments as jest.Mock).mockResolvedValue(0)

    const req = makeRequest('GET', 'http://localhost/api/admin/users?status=banned')
    const res = await getUsersHandler(req)
    expect(res.status).toBe(200)
    const findCall = (User.find as jest.Mock).mock.calls[0][0]
    expect(findCall.status).toBe('banned')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/admin/users/[id]
// ═════════════════════════════════════════════════════════════════════════════

describe('PUT /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest('PUT', 'http://localhost/api/admin/users/u1', { role: 'admin' })
    const res = await putUserHandler(req, makeParams('u1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no valid fields provided', async () => {
    const req = makeRequest('PUT', 'http://localhost/api/admin/users/u1', { foo: 'bar' })
    const res = await putUserHandler(req, makeParams('u1'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when user not found', async () => {
    ;(User.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    })
    const req = makeRequest('PUT', 'http://localhost/api/admin/users/nonexistent', { role: 'admin' })
    const res = await putUserHandler(req, makeParams('nonexistent'))
    expect(res.status).toBe(404)
  })

  it('bans user and returns 200', async () => {
    const updated = { _id: 'u1', username: 'test', status: 'banned', ban_reason: 'manual' }
    ;(User.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(updated),
      }),
    })
    const req = makeRequest('PUT', 'http://localhost/api/admin/users/u1', { status: 'banned' })
    const res = await putUserHandler(req, makeParams('u1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user.status).toBe('banned')
  })

  it('unbans user and resets violations', async () => {
    const updated = { _id: 'u1', username: 'test', status: 'active', sharing_violations: 0 }
    ;(User.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(updated),
      }),
    })
    const req = makeRequest('PUT', 'http://localhost/api/admin/users/u1', { status: 'active' })
    const res = await putUserHandler(req, makeParams('u1'))
    expect(res.status).toBe(200)
    // Verify the update included reset fields
    const updateCall = (User.findByIdAndUpdate as jest.Mock).mock.calls[0][1]
    expect(updateCall.ban_reason).toBeNull()
    expect(updateCall.sharing_violations).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/users/[id]
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest('DELETE', 'http://localhost/api/admin/users/u1')
    const res = await deleteUserHandler(req, makeParams('u1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when admin tries to delete themselves', async () => {
    const req = makeRequest('DELETE', 'http://localhost/api/admin/users/admin-user-id')
    const res = await deleteUserHandler(req, makeParams('admin-user-id'))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/own account/i)
  })

  it('returns 404 when user not found', async () => {
    ;(User.findByIdAndDelete as jest.Mock).mockResolvedValue(null)
    const req = makeRequest('DELETE', 'http://localhost/api/admin/users/nonexistent')
    const res = await deleteUserHandler(req, makeParams('nonexistent'))
    expect(res.status).toBe(404)
  })

  it('deletes user and returns 200', async () => {
    ;(User.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: 'u1' })
    const req = makeRequest('DELETE', 'http://localhost/api/admin/users/u1')
    const res = await deleteUserHandler(req, makeParams('u1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('Deleted')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/admin/users/bulk
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/users/bulk', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest('POST', 'http://localhost/api/admin/users/bulk', { ids: ['u1'], action: 'delete' })
    const res = await bulkUsersHandler(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when ids is missing', async () => {
    const req = makeRequest('POST', 'http://localhost/api/admin/users/bulk', { action: 'delete' })
    const res = await bulkUsersHandler(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when ids is empty array', async () => {
    const req = makeRequest('POST', 'http://localhost/api/admin/users/bulk', { user_ids: [], action: 'delete' })
    const res = await bulkUsersHandler(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when ids exceeds 100', async () => {
    const ids = Array.from({ length: 101 }, () => '507f1f77bcf86cd799439011')
    const req = makeRequest('POST', 'http://localhost/api/admin/users/bulk', { user_ids: ids, action: 'delete' })
    const res = await bulkUsersHandler(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/100/i)
  })

  it('returns 400 when action is invalid', async () => {
    const req = makeRequest('POST', 'http://localhost/api/admin/users/bulk', { user_ids: ['507f1f77bcf86cd799439011'], action: 'invalid' })
    const res = await bulkUsersHandler(req)
    expect(res.status).toBe(400)
  })

  it('bulk deletes users and returns 200', async () => {
    ;(User.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 })
    const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013']
    const req = makeRequest('POST', 'http://localhost/api/admin/users/bulk', { user_ids: ids, action: 'delete' })
    const res = await bulkUsersHandler(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.affected).toBe(3)
  })

  it('bulk bans users and returns 200', async () => {
    ;(User.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 })
    const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
    const req = makeRequest('POST', 'http://localhost/api/admin/users/bulk', { user_ids: ids, action: 'ban' })
    const res = await bulkUsersHandler(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.affected).toBe(2)
  })

  it('removes admin own ID from bulk delete', async () => {
    ;(User.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 })
    const req = makeRequest('POST', 'http://localhost/api/admin/users/bulk', {
      user_ids: ['admin-user-id', '507f1f77bcf86cd799439012'],
      action: 'delete',
    })
    const res = await bulkUsersHandler(req)
    expect(res.status).toBe(200)
    // Verify deleteMany was called without admin's own ID
    const deleteCall = (User.deleteMany as jest.Mock).mock.calls[0][0]
    expect(deleteCall._id.$in).toEqual(['507f1f77bcf86cd799439012'])
  })
})
