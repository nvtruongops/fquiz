import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { UpdateVocabularySchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody, invalidIdResponse } from '@/lib/core/api-helpers'
import type { VocabularyService } from '@/lib/modules/learning/services/vocabulary.service'

export const GET = withAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    const vocabService = container.resolve<VocabularyService>('VocabularyService')
    const vocabulary = await vocabService.getById(id)
    if (!vocabulary) {
      return NextResponse.json({ error: 'Vocabulary not found' }, { status: 404 })
    }

    return NextResponse.json({ vocabulary })
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

    const parsed = UpdateVocabularySchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const vocabService = container.resolve<VocabularyService>('VocabularyService')
    const vocabulary = await vocabService.update(id, parsed.data as any)
    if (!vocabulary) {
      return NextResponse.json({ error: 'Vocabulary not found' }, { status: 404 })
    }

    return NextResponse.json({ vocabulary })
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
    const vocabService = container.resolve<VocabularyService>('VocabularyService')
    const success = await vocabService.delete(id)
    if (!success) {
      return NextResponse.json({ error: 'Vocabulary not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })
