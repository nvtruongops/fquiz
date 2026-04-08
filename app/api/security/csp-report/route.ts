import { NextResponse } from 'next/server'
import logger from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const report = await request.json()
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
  } catch (err) {
    // Silently ignore malformed reports to avoid log flooding/attacks
    return new NextResponse(null, { status: 400 })
  }
}
