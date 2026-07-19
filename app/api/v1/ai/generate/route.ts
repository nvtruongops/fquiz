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
          const p = (parsed.data.params as Record<string, any>) || {}
          if (parsed.data.type === 'writing_eval') {
            const sourceText = (p.sourceText as string) || ''
            const existingLog = await AILearningLog.findOne({
              userId: payload.userId,
              type: { $in: ['writing', 'writing_eval'] },
              ...(sourceText ? { response: { $regex: sourceText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } } : {}),
            }).sort({ createdAt: -1 })

            if (existingLog) {
              await AILearningLog.findByIdAndUpdate(existingLog._id, {
                $set: {
                  type: 'writing_eval',
                  response: JSON.stringify(result.content),
                  'metadata.params': { ...((existingLog.metadata as any)?.params || {}), ...p },
                  'metadata.userSubmission': p.userAnswer,
                  'metadata.evalResult': result.content,
                  'metadata.score': (result.content as any)?.score,
                  score: (result.content as any)?.score,
                  userSubmission: p.userAnswer,
                  evalResult: result.content,
                },
              })
            } else {
              await AILearningLog.create({
                userId: payload.userId,
                type: 'writing_eval',
                language: (p.language as string) || (p.targetLanguage as string) || (p.sourceLanguage as string) || '',
                topic: (p.topic as string) || (p.selectedTopicSlug as string) || (p.customTopicInput as string) || '',
                cefrLevel: (p.cefr as string) || (p.cefrLevel as string) || '',
                prompt: JSON.stringify(p),
                aiProvider: 'gemini',
                tokensUsed: result.tokensUsed?.input,
                durationMs: result.durationMs,
                response: JSON.stringify(result.content),
                metadata: {
                  params: p,
                  userSubmission: p.userAnswer,
                  evalResult: result.content,
                  score: (result.content as any)?.score,
                },
              })
            }
          } else {
            await AILearningLog.create({
              userId: payload.userId,
              type: parsed.data.type,
              language: (p.language as string) || (p.targetLanguage as string) || (p.sourceLanguage as string) || '',
              topic: (p.topic as string) || (p.selectedTopicSlug as string) || (p.customTopicInput as string) || '',
              cefrLevel: (p.cefr as string) || (p.cefrLevel as string) || '',
              prompt: JSON.stringify(p),
              aiProvider: 'gemini',
              tokensUsed: result.tokensUsed?.input,
              durationMs: result.durationMs,
              response: JSON.stringify(result.content),
              metadata: {
                params: p,
                userSubmission: p.userAnswer,
                evalResult: undefined,
              },
            })
          }
        } catch {}
      }

      return NextResponse.json({
        success: true,
        data: result,
      })
    } catch (err: any) {
      console.error('[API /api/v1/ai/generate] Error:', err)
      
      const errMsg = String(err?.message || '').toLowerCase()
      let friendlyError = 'Trợ lý AI hiện đang gặp sự cố kết nối hoặc phản hồi không đúng cấu trúc học tập. Vui lòng thử lại sau!'
      
      if (errMsg.includes('api key') || errMsg.includes('api_key') || errMsg.includes('gemini_api_key') || errMsg.includes('not set')) {
        friendlyError = 'Dịch vụ AI chưa được cấu hình khóa API (API Key) hợp lệ. Vui lòng liên hệ với quản trị viên hệ thống để kiểm tra.'
      } else if (errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('429') || errMsg.includes('too many requests')) {
        friendlyError = 'Yêu cầu vượt quá hạn mức sử dụng AI cho phép (Rate Limit / Quota). Vui lòng thử lại sau ít phút.'
      } else if (errMsg.includes('safety') || errMsg.includes('block') || errMsg.includes('harm') || errMsg.includes('content')) {
        friendlyError = 'Yêu cầu hoặc kết quả bị bộ lọc an toàn AI từ chối vì lý do bảo mật nội dung.'
      } else if (errMsg.includes('timeout') || errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('connect') || errMsg.includes('enotfound')) {
        friendlyError = 'Không thể kết nối dịch vụ AI. Vui lòng thử lại sau.'
      } else if (err?.message) {
        friendlyError = `Lỗi kết nối LLM: ${err.message}`
      }

      return NextResponse.json(
        { error: friendlyError },
        { status: 500 }
      )
    }
  },
  { roles: ['dev'] }
)
