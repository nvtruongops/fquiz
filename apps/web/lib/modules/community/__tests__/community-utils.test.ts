import { validatePostRequest } from '../utils'
import { Types } from 'mongoose'

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/modules/auth/dal', () => ({
  verifySession: jest.fn(),
}))

jest.mock('../models/Post', () => ({
  Post: {
    findById: jest.fn(),
  },
}))

import { verifySession } from '@/lib/modules/auth/dal'
import { Post } from '../models/Post'

describe('Community Utils Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns 400 for invalid ObjectId post ID', async () => {
    const res = await validatePostRequest('invalid-post-id')
    expect(res.isValid).toBe(false)
    if (!res.isValid) {
      expect(res.response.status).toBe(400)
    }
  })

  test('returns 401 when session is unauthenticated', async () => {
    const validId = new Types.ObjectId().toString()
    ;(verifySession as jest.Mock).mockResolvedValue(null)

    const res = await validatePostRequest(validId)
    expect(res.isValid).toBe(false)
    if (!res.isValid) {
      expect(res.response.status).toBe(401)
    }
  })

  test('returns 404 when post is not found', async () => {
    const validId = new Types.ObjectId().toString()
    ;(verifySession as jest.Mock).mockResolvedValue({ userId: 'u1' })
    ;(Post.findById as jest.Mock).mockResolvedValue(null)

    const res = await validatePostRequest(validId)
    expect(res.isValid).toBe(false)
    if (!res.isValid) {
      expect(res.response.status).toBe(404)
    }
  })

  test('returns valid true when session and post exist', async () => {
    const validId = new Types.ObjectId().toString()
    const mockPost = { _id: validId, content: 'Hello Community' }
    ;(verifySession as jest.Mock).mockResolvedValue({ userId: 'u1' })
    ;(Post.findById as jest.Mock).mockResolvedValue(mockPost)

    const res = await validatePostRequest(validId)
    expect(res.isValid).toBe(true)
    if (res.isValid) {
      expect(res.post).toEqual(mockPost)
      expect(res.session.userId).toBe('u1')
    }
  })
})
