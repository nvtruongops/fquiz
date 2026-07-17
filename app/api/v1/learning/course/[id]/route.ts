import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { UpdateCourseSchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody, invalidIdResponse } from '@/lib/core/api-helpers'
import type { CourseRepository } from '@/lib/modules/learning/repositories/course.repository'

export const GET = withAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    const courseRepo = container.resolve<CourseRepository>('CourseRepository')
    const course = await courseRepo.findById(id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({ course })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })

export const PUT = withAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const parsed = UpdateCourseSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const courseRepo = container.resolve<CourseRepository>('CourseRepository')
    const course = await courseRepo.update(id, parsed.data as any)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({ course })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })

export const DELETE = withAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    const courseRepo = container.resolve<CourseRepository>('CourseRepository')
    const success = await courseRepo.delete(id)
    if (!success) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })
