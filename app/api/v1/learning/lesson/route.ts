import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { CreateLessonSchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody } from '@/lib/core/api-helpers'
import type { LessonRepository } from '@/lib/modules/learning/repositories/lesson.repository'
import type { LessonLearningService } from '@/lib/modules/learning/services/lesson-learning.service'

export const GET = withAuth(async (req, { payload }) => {
  try {
    const { searchParams } = new URL(req.url)
    const moduleId = searchParams.get('moduleId')
    const lessonId = searchParams.get('lessonId')

    await connectDB()

    if (lessonId) {
      const lessonLearningService = container.resolve<LessonLearningService>('LessonLearningService')
      const lessonContent = await lessonLearningService.loadLesson(payload.userId, lessonId)
      if (!lessonContent) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
      }
      return NextResponse.json(lessonContent)
    }

    if (moduleId) {
      const lessonRepo = container.resolve<LessonRepository>('LessonRepository')
      const items = await lessonRepo.findByModule(moduleId)
      return NextResponse.json({ items })
    }

    return NextResponse.json({ error: 'Either moduleId or lessonId parameter is required' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })

export const POST = withAuth(async (req) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const parsed = CreateLessonSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const lessonRepo = container.resolve<LessonRepository>('LessonRepository')
    const lesson = await lessonRepo.create(parsed.data as any)

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })
