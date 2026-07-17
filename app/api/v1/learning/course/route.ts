import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { CreateCourseSchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody } from '@/lib/core/api-helpers'
import type { CourseRepository } from '@/lib/modules/learning/repositories/course.repository'
import type { CourseLearningService } from '@/lib/modules/learning/services/course-learning.service'

export const GET = withAuth(async (req, { payload }) => {
  try {
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')
    const languageId = searchParams.get('languageId')
    const cefrLevel = searchParams.get('cefrLevel')

    await connectDB()

    if (courseId) {
      const courseLearningService = container.resolve<CourseLearningService>('CourseLearningService')
      const courseStructure = await courseLearningService.getCourseStructure(payload.userId, courseId)
      if (!courseStructure) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }
      return NextResponse.json(courseStructure)
    }

    if (languageId) {
      const courseRepo = container.resolve<CourseRepository>('CourseRepository')
      let items
      if (cefrLevel) {
        items = await courseRepo.findByCEFR(languageId, cefrLevel)
      } else {
        items = await courseRepo.findByLanguage(languageId)
      }
      return NextResponse.json({ items })
    }

    return NextResponse.json({ error: 'Either courseId or languageId parameter is required' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })

export const POST = withAuth(async (req) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const parsed = CreateCourseSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const courseRepo = container.resolve<CourseRepository>('CourseRepository')
    const course = await courseRepo.create(parsed.data as any)

    return NextResponse.json({ course }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })
