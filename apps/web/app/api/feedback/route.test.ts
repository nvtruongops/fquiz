jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: (request: Request, context: { payload: unknown }) => unknown) =>
    (request: Request) => handler(request, { payload: { userId: 'student-1' } }),
}))
jest.mock('@/lib/modules/auth/models/Feedback', () => ({
  Feedback: { countDocuments: jest.fn(), create: jest.fn() },
}))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { findById: jest.fn() } }))
const mockFeedbackLimitCheck = jest.fn()
jest.mock('@/lib/core/security/rate-limit/feedback-quota', () => ({
  consumeFeedbackQuota: mockFeedbackLimitCheck,
}))

import { connectDB } from '@/lib/core/db/mongodb'
import { Feedback } from '@/lib/modules/auth/models/Feedback'
import { User } from '@/lib/modules/auth/models/User'
import { POST } from './route'

describe('POST /api/feedback bounded body', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(undefined)
    ;(mockFeedbackLimitCheck as jest.Mock).mockResolvedValue({ success: true })
    ;(User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ username: 'student', email: 'student@example.com' }) }),
    })
    ;(Feedback.create as jest.Mock).mockResolvedValue(undefined)
  })

  it('rejects an oversized chunked JSON body before connecting or querying', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(5001))
      },
      cancel() {
        cancelled = true
      },
    }, { highWaterMark: 0 })
    const request = new Request('https://fquiz.online/api/feedback', {
      method: 'POST',
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    const response = await POST(request)

    expect(response.status).toBe(413)
    expect(cancelled).toBe(true)
    expect(connectDB).not.toHaveBeenCalled()
    expect(Feedback.countDocuments).not.toHaveBeenCalled()
    expect(Feedback.create).not.toHaveBeenCalled()
  })

  it('uses the atomic rolling quota and prevents concurrent requests from both creating feedback', async () => {
    ;(mockFeedbackLimitCheck as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    const body = JSON.stringify({ type: 'bug', message: 'A valid feedback report' })
    const makeRequest = () => new Request('https://fquiz.online/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })

    const responses = await Promise.all([POST(makeRequest()), POST(makeRequest())])

    expect(mockFeedbackLimitCheck).toHaveBeenNthCalledWith(1, 'student-1')
    expect(mockFeedbackLimitCheck).toHaveBeenNthCalledWith(2, 'student-1')
    expect(responses.map((response) => response.status).sort()).toEqual([201, 429])
    expect(Feedback.create).toHaveBeenCalledTimes(1)
  })

  it('fails closed with the existing generic error when quota storage fails', async () => {
    ;(mockFeedbackLimitCheck as jest.Mock).mockRejectedValue(new Error('quota store unavailable'))
    const response = await POST(new Request('https://fquiz.online/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'bug', message: 'A valid feedback report' }),
    }))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal server error' })
    expect(Feedback.create).not.toHaveBeenCalled()
  })
})
