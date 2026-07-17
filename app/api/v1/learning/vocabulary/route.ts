import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { CreateVocabularySchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody } from '@/lib/core/api-helpers'
import type { VocabularyService } from '@/lib/modules/learning/services/vocabulary.service'

export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url)
    const languageId = searchParams.get('languageId')
    if (!languageId) {
      return NextResponse.json({ error: 'languageId parameter is required' }, { status: 400 })
    }

    const cefrLevel = searchParams.get('cefrLevel')
    const skip = Number(searchParams.get('skip') || '0')
    const limit = Number(searchParams.get('limit') || '20')

    await connectDB()
    const vocabService = container.resolve<VocabularyService>('VocabularyService')

    let items
    if (cefrLevel) {
      items = await vocabService.listByCEFR(languageId, cefrLevel, skip, limit)
    } else {
      items = await vocabService.listByLanguage(languageId, skip, limit)
    }

    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })

export const POST = withAuth(async (req) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const parsed = CreateVocabularySchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const vocabService = container.resolve<VocabularyService>('VocabularyService')
    const vocab = await vocabService.create(parsed.data as any)

    return NextResponse.json({ vocabulary: vocab }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })
