jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: (request: Request, context: { payload: unknown }) => unknown) =>
    (request: Request) => handler(request, { payload: { userId: 'student-1', role: 'student' } }),
}))
jest.mock('@/lib/modules/quiz/quiz-import', () => ({ buildQuizImportPreview: jest.fn() }))
jest.mock('@/lib/modules/quiz/models/Category', () => ({ Category: { findOne: jest.fn() } }))

import { connectDB } from '@/lib/core/db/mongodb'
import { buildQuizImportPreview } from '@/lib/modules/quiz/quiz-import'
import { POST } from './route'

describe('POST /api/import/quiz/preview bounded body', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(undefined)
    ;(buildQuizImportPreview as jest.Mock).mockReturnValue({
      normalizedQuiz: {},
      diagnostics: [],
      summary: { errors: 0, warnings: 0 },
      isValid: true,
    })
  })

  it('rejects a multipart request over the bounded file-plus-overhead cap before parsing', async () => {
    let cancelled = false
    let pulled = false
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled) return
        pulled = true
        controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 64 * 1024 + 1))
      },
      cancel() {
        cancelled = true
      },
    }, { highWaterMark: 0 })
    const request = new Request('https://fquiz.online/api/import/quiz/preview', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=unused' },
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    const response = await POST(request)

    expect(response.status).toBe(413)
    expect(cancelled).toBe(true)
    expect(buildQuizImportPreview).not.toHaveBeenCalled()
    expect(connectDB).not.toHaveBeenCalled()
  })

  it('accepts a file exactly at the 2 MiB limit with multipart boundary overhead', async () => {
    const body = new FormData()
    body.set('file', new File([new Uint8Array(2 * 1024 * 1024)], 'quiz.json'))
    const request = new Request('https://fquiz.online/api/import/quiz/preview', {
      method: 'POST',
      body,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(buildQuizImportPreview).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    expect((buildQuizImportPreview as jest.Mock).mock.calls[0][0]).toHaveLength(2 * 1024 * 1024)
  })
})
