import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { container } from '@/lib/core/di'
import type { AIContentService } from '@/lib/modules/ai/services/ai-content.service'
import { AILearningLog } from '@/lib/modules/ai/models/AILearningLog'
import type { JWTPayload } from '@/lib/modules/auth/auth'

export const dynamic = 'force-dynamic'

const GenerateRequestSchema = z.object({
  type: z.enum([
    'vocabulary',
    'sentence',
    'paragraph',
    'grammar',
    'quiz',
    'flashcard',
    'translation',
    'dialogue',
    'story',
    'writing',
    'writing_eval',
  ]),
  params: z.record(z.string(), z.unknown()).default({}),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
})

/**
 * POST /api/v1/ai/generate
 * Dynamic AI content generation endpoint for authenticated students & admins.
 */
export const POST = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      let body: unknown
      try {
        body = await req.json()
      } catch {
        return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 })
      }

      const parsed = GenerateRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dữ liệu yêu cầu không hợp lệ', details: parsed.error.issues },
          { status: 400 }
        )
      }

      await connectDB()

      const aiContentService = container.resolve<AIContentService>('AIContentService')

      const result = await aiContentService.generate({
        type: parsed.data.type as any,
        params: parsed.data.params,
        sourceType: parsed.data.sourceType,
        sourceId: parsed.data.sourceId,
      })

      if (payload?.userId && result?.content) {
        try {
          await AILearningLog.create({
            userId: payload.userId,
            type: parsed.data.type,
            language: (parsed.data.params.language as string) || '',
            topic: parsed.data.params.topic as string,
            cefrLevel: parsed.data.params.cefr as string,
            aiProvider: 'gemini',
            tokensUsed: result.tokensUsed?.input,
            durationMs: result.durationMs,
            response: JSON.stringify(result.content).slice(0, 500),
          }).catch(() => {})
        } catch {}
      }

      return NextResponse.json({
        success: true,
        data: result,
      })
    } catch (err: any) {
      console.error('[API /api/v1/ai/generate] Error:', err)
      return NextResponse.json(
        { error: err.message || 'Lỗi sinh nội dung AI' },
        { status: 500 }
      )
    }
  },
  { roles: ['dev'] }
)
