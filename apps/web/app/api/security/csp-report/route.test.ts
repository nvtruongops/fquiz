jest.mock('@/lib/core/utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn() },
}))

import logger from '@/lib/core/utils/logger'
import { POST } from './route'

function chunkedRequest(size: number) {
  let pulled = false
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled) return
      pulled = true
      controller.enqueue(new Uint8Array(size))
    },
    cancel() {
      cancelled = true
    },
  }, { highWaterMark: 0 })
  const request = new Request('https://fquiz.online/api/security/csp-report', {
    method: 'POST',
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
  return { request, wasCancelled: () => cancelled }
}

describe('POST /api/security/csp-report bounded body', () => {
  beforeEach(() => jest.clearAllMocks())

  it('cancels an oversized chunked report before logging it', async () => {
    const { request, wasCancelled } = chunkedRequest(8193)

    const response = await POST(request)

    expect(response.status).toBe(413)
    expect(wasCancelled()).toBe(true)
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
