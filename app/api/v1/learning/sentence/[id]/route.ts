import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { UpdateSentenceSchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody, invalidIdResponse } from '@/lib/core/api-helpers'
import type { SentenceService } from '@/lib/modules/learning/services/sentence.service'

export const GET = withAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    const sentenceService = container.resolve<SentenceService>('SentenceService')
    const sentence = await sentenceService.getWithRelations(id)
    if (!sentence) {
      return NextResponse.json({ error: 'Sentence not found' }, { status: 404 })
    }

    return NextResponse.json({ sentence })
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

    const parsed = UpdateSentenceSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const sentenceService = container.resolve<SentenceService>('SentenceService')
    const sentence = await sentenceService.update(id, parsed.data as any)
    if (!sentence) {
      return NextResponse.json({ error: 'Sentence not found' }, { status: 404 })
    }

    return NextResponse.json({ sentence })
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
    const sentenceService = container.resolve<SentenceService>('SentenceService')
    const success = await sentenceService.delete(id)
    if (!success) {
      return NextResponse.json({ error: 'Sentence not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })
