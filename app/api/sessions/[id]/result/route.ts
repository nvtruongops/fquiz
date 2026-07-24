import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { JWTPayload } from '@/lib/modules/auth/auth'
import { getQuizSessionResult } from '@/lib/modules/quiz/session-utils'

/**
 * GET /api/sessions/[id]/result
 * Returns the full result for a completed quiz session.
 * Requirements: 9.3, 12.2, 12.4
 */
export const GET = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const result = await getQuizSessionResult(id, payload.userId)
    if (!result) {
      return NextResponse.json({ error: 'Result not found or not completed' }, { status: 404 })
    }
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error('GET /api/sessions/[id]/result error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })