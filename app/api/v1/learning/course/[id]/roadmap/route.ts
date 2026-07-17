import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { invalidIdResponse } from '@/lib/core/api-helpers'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import type { CourseLearningService } from '@/lib/modules/learning/services/course-learning.service'

export const GET = withAuth(async (req, { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    const courseLearningService = container.resolve<CourseLearningService>('CourseLearningService')
    const roadmap = await courseLearningService.getRoadmap(payload.userId, id)

    if (!roadmap) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(roadmap)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })
