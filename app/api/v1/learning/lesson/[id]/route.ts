import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { UpdateLessonSchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody, invalidIdResponse } from '@/lib/core/api-helpers'
import type { LessonRepository } from '@/lib/modules/learning/repositories/lesson.repository'

export const GET = withAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    const lessonRepo = container.resolve<LessonRepository>('LessonRepository')
    const lesson = await lessonRepo.findById(id)
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    return NextResponse.json({ lesson })
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

    const parsed = UpdateLessonSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const lessonRepo = container.resolve<LessonRepository>('LessonRepository')
    const lesson = await lessonRepo.update(id, parsed.data as any)
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    return NextResponse.json({ lesson })
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
    const lessonRepo = container.resolve<LessonRepository>('LessonRepository')
    const success = await lessonRepo.delete(id)
    if (!success) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })
