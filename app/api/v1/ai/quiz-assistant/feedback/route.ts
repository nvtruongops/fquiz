import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizAITelemetry } from '@/lib/modules/ai/quiz-assistant/telemetry/quiz-ai-telemetry'
import { QuizAIIntentEnum } from '@/lib/modules/ai/quiz-assistant/schemas/quiz-assistant.schema'

export const dynamic = 'force-dynamic'

const FeedbackRequestSchema = z.object({
  requestId: z.string().optional(),
  sessionId: z.string().min(1),
  questionIndex: z.number().int().min(0),
  intent: QuizAIIntentEnum.optional(),
  responseMode: z.enum(['llm', 'db_fallback', 'cached']).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  helpful: z.boolean(),
})

/**
 * POST /api/v1/ai/quiz-assistant/feedback
 * Records user micro-feedback (helpful: true/false) for P4 helpfulnessRate telemetry
 */
export const POST = withAuth(
  async (req: Request) => {
    try {
      const body = await req.json().catch(() => null)
      const parsed = FeedbackRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dữ liệu phản hồi không hợp lệ', details: parsed.error.issues },
          { status: 400 }
        )
      }

      const { requestId, sessionId, questionIndex, intent, responseMode, confidence, helpful } = parsed.data

      QuizAITelemetry.recordFeedback({
        feedbackId: `fb_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        requestId,
        sessionId,
        questionIndex,
        intent,
        responseMode,
        confidence,
        helpful,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({ ok: true, message: 'Phản hồi đã được ghi nhận thành công' })
    } catch (err: any) {
      console.error('[POST /api/v1/ai/quiz-assistant/feedback] Error:', err)
      const message = err instanceof Error ? err.message : 'Internal server error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  },
  { roles: ['student', 'admin', 'dev', 'teacher'] }
)
