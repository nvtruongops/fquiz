import { NextResponse } from 'next/server'
import logger from '@/lib/core/utils/logger'

const MAX_CSP_REPORT_BYTES = 8192

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_CSP_REPORT_BYTES) {
      return new NextResponse(null, { status: 413 })
    }

    const rawBody = await request.text()
    if (rawBody.length > MAX_CSP_REPORT_BYTES) {
      return new NextResponse(null, { status: 413 })
    }

    const report = JSON.parse(rawBody)
    const requestId = request.headers.get('x-request-id') || 'unknown'

    logger.warn(
      {
        event: 'csp_violation',
        request_id: requestId,
        report: report['csp-report'] || report,
      },
      'CSP Violation Reported'
    )

    return new NextResponse(null, { status: 204 })
  } catch {
    // Silently ignore malformed reports to avoid log flooding/attacks
    return new NextResponse(null, { status: 400 })
  }
}
