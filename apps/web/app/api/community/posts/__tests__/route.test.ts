/**
 * Tests for /api/community/posts API route
 */

import { GET, POST } from '../route'
import { verifySession } from '@/lib/modules/auth/dal'
import { Post } from '@/lib/modules/community/models/Post'

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200, ...init })),
  },
}))

jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((str: string) => str),
  },
}))

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/modules/auth/dal', () => ({
  verifySession: jest.fn(),
}))

jest.mock('@/lib/modules/community/models/Post', () => ({
  Post: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
  },
}))

describe('/api/community/posts API Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/community/posts', () => {
    it('returns posts and featured topics successfully', async () => {
      const mockPosts = [
        { _id: 'post1', title: 'Test Post', content: 'Content', authorName: 'Alice', tags: ['Math'] },
      ]
      ;(Post.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockPosts),
              }),
            }),
          }),
        }),
      })
      ;(Post.countDocuments as jest.Mock).mockResolvedValue(1)
      ;(Post.aggregate as jest.Mock).mockResolvedValue([
        { _id: 'math', name: 'Math', totalViews: 10, postCount: 2 },
      ])

      const req = new Request('http://localhost/api/community/posts?page=1&limit=10')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(res.body.posts).toEqual(mockPosts)
      expect(res.body.popularTags).toEqual(['Math'])
    })
  })

  describe('POST /api/community/posts', () => {
    it('returns 401 when user session is unauthorized', async () => {
      ;(verifySession as jest.Mock).mockResolvedValue(null)
      const req = new Request('http://localhost/api/community/posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Title', content: 'Content' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Unauthorized')
    })

    it('returns 400 when body validation fails', async () => {
      ;(verifySession as jest.Mock).mockResolvedValue({ userId: '507f1f77bcf86cd799439011', username: 'student' })
      const req = new Request('http://localhost/api/community/posts', {
        method: 'POST',
        body: JSON.stringify({ title: '', content: '' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it('creates post successfully with sanitized content', async () => {
      const mockUser = { userId: '507f1f77bcf86cd799439011', username: 'student' }
      ;(verifySession as jest.Mock).mockResolvedValue(mockUser)
      
      const createdPost = {
        _id: 'post_123',
        title: 'Thắc mắc giải đề #Toán',
        content: 'Nội dung thắc mắc',
        tags: ['Toán'],
        authorName: 'student',
      }
      ;(Post.create as jest.Mock).mockResolvedValue(createdPost)

      const req = new Request('http://localhost/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Thắc mắc giải đề #Toán',
          content: 'Nội dung thắc mắc',
          tags: ['Toán'],
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(res.body.post).toEqual(createdPost)
    })
  })
})
