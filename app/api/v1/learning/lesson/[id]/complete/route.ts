import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { invalidIdResponse, parseJsonBody } from '@/lib/core/api-helpers'
import { z } from 'zod'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import type { LessonLearningService } from '@/lib/modules/learning/services/lesson-learning.service'

const CompleteSchema = z.object({
  version: z.number().int().min(1).default(1),
})

export const POST = withAuth(async (req, { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    const body = await parseJsonBody(req)
    const data = (body instanceof NextResponse || !body) ? {} : body
    const parsed = CompleteSchema.safeParse(data)
    const version = parsed.success ? parsed.data.version : 1

    const lessonLearningService = container.resolve<LessonLearningService>('LessonLearningService')
    await lessonLearningService.completeLesson(payload.userId, id, version)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })
