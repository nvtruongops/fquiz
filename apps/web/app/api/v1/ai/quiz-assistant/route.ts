import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import {
  QuizAssistantRequestSchema,
  QuizAIOrchestrator,
} from '@/lib/modules/ai/quiz-assistant'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/ai/quiz-assistant
 * Thin Controller: Handles HTTP validation, JWT auth & delegates to QuizAIOrchestrator
 */
export const POST = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      const body = await req.json().catch(() => null)
      const parsed = QuizAssistantRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dữ liệu yêu cầu không hợp lệ', details: parsed.error.issues },
          { status: 400 }
        )
      }

      await connectDB()

      const orchestrator = new QuizAIOrchestrator()
      const result = await orchestrator.execute({
        authenticatedUserId: payload.userId, // 🛡️ Invariant 1: Authoritative JWT identity
        ...parsed.data,
      })

      return NextResponse.json({
        ok: true,
        data: result,
      })
    } catch (err: any) {
      console.error('[POST /api/v1/ai/quiz-assistant] Error:', err)
      const status = typeof err?.status === 'number' ? err.status : 500
      const message = err instanceof Error ? err.message : 'Internal server error'
      return NextResponse.json({ error: message }, { status })
    }
  },
  { roles: ['student', 'admin', 'dev'] }
)
