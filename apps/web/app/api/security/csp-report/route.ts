import { NextResponse } from 'next/server'
import logger from '@/lib/core/utils/logger'
import { BodyTooLargeError, readBoundedBody } from '@/lib/core/api-helpers'

const MAX_CSP_REPORT_BYTES = 8192

export async function POST(request: Request) {
  try {
    const bytes = await readBoundedBody(request, MAX_CSP_REPORT_BYTES)
    const rawBody = new TextDecoder().decode(bytes)
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
  } catch (error) {
    if (error instanceof BodyTooLargeError) return new NextResponse(null, { status: 413 })
    // Silently ignore malformed reports to avoid log flooding/attacks
    return new NextResponse(null, { status: 400 })
  }
}
