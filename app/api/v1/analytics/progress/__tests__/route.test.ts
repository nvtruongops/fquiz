import { NextResponse } from 'next/server'

class MockNextResponse {
  body: any
  status: number
  constructor(body: any, init?: any) {
    this.body = body
    this.status = init?.status ?? 200
  }
  static json(body: any, init?: any) {
    return new MockNextResponse(body, init)
  }
}

jest.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}))

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx?: any) =>
    handler(req, {
      payload: { userId: 'user-123', role: 'student', v: 1 },
      params: ctx?.params,
    }),
}))

import { container } from '@/lib/core/di'

describe('API v1 Analytics Progress Routes', () => {
  let mockProgressService: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockProgressService = {
      getDueReviews: jest.fn().mockResolvedValue([{ learningObjectId: 'lo-123' }]),
      getStats: jest.fn().mockResolvedValue({ mastered: 10 }),
      recordReview: jest.fn().mockResolvedValue({ masteryLevel: 15 }),
    }

    // Mock DI Container resolves
    jest.spyOn(container, 'resolve').mockImplementation((token: string) => {
      if (token === 'LearningProgressService') return mockProgressService
      throw new Error(`Unexpected token: ${token}`)
    })
  })

  it('should get stats by default', async () => {
    const { GET } = require('../route')
    const req = new Request('http://localhost/api/v1/analytics/progress')
    const res = await GET(req)
    expect(mockProgressService.getStats).toHaveBeenCalledWith('user-123', undefined)
    expect(res.body.stats).toBeDefined()
  })

  it('should get due reviews when due=true', async () => {
    const { GET } = require('../route')
    const req = new Request('http://localhost/api/v1/analytics/progress?due=true&limit=10')
    const res = await GET(req)
    expect(mockProgressService.getDueReviews).toHaveBeenCalledWith('user-123', 10)
    expect(res.body.items).toBeDefined()
  })

  it('should record review on POST', async () => {
    const { POST } = require('../route')
    const req = new Request('http://localhost/api/v1/analytics/progress', {
      method: 'POST',
      body: JSON.stringify({
        learningObjectId: '507f1f77bcf86cd799439011',
        loType: 'vocabulary',
        version: 1,
        result: 'correct',
        strategy: 'manual',
      }),
    })
    const res = await POST(req)
    expect(mockProgressService.recordReview).toHaveBeenCalledWith(
      'user-123',
      {
        learningObjectId: '507f1f77bcf86cd799439011',
        loType: 'vocabulary',
        version: 1,
        result: 'correct',
      },
      'manual'
    )
    expect(res.body.progress).toBeDefined()
  })
})
