import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { SubmitReviewSchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody } from '@/lib/core/api-helpers'
import type { LearningProgressService } from '@/lib/modules/learning/services/learning-progress.service'
import type { JWTPayload } from '@/lib/modules/auth/auth'

export const POST = withAuth(async (req, { payload }: { payload: JWTPayload }) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const parsed = SubmitReviewSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const { learningObjectId, loType, version, result, strategy } = parsed.data

    const progressService = container.resolve<LearningProgressService>('LearningProgressService')
    const progress = await progressService.recordReview(payload.userId, {
      learningObjectId,
      loType,
      version,
      result,
    }, strategy)

    return NextResponse.json({
      progress: {
        id: progress._id.toString(),
        masteryLevel: progress.masteryLevel,
        reviewCount: progress.reviewCount,
        nextReviewAt: progress.nextReviewAt?.toISOString(),
        lastResult: progress.lastResult,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })
