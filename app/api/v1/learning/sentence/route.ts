import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { CreateSentenceSchema } from '@/lib/modules/learning/schemas/learning'
import { validationErrorResponse, parseJsonBody } from '@/lib/core/api-helpers'
import type { SentenceService } from '@/lib/modules/learning/services/sentence.service'

export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url)
    const languageId = searchParams.get('languageId')
    const paragraphId = searchParams.get('paragraphId')

    await connectDB()
    const sentenceService = container.resolve<SentenceService>('SentenceService')

    let items
    if (paragraphId) {
      items = await sentenceService.getParagraphSentences(paragraphId)
    } else if (languageId) {
      const skip = Number(searchParams.get('skip') || '0')
      const limit = Number(searchParams.get('limit') || '20')
      items = await sentenceService.listByLanguage(languageId, skip, limit)
    } else {
      return NextResponse.json({ error: 'Either languageId or paragraphId must be provided' }, { status: 400 })
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

    const parsed = CreateSentenceSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const { vocabLinks, ...sentenceData } = parsed.data
    const sentenceService = container.resolve<SentenceService>('SentenceService')

    let sentence
    if (vocabLinks && vocabLinks.length > 0) {
      sentence = await sentenceService.createWithVocabLinks(sentenceData as any, vocabLinks as any)
    } else {
      sentence = await sentenceService.create(sentenceData as any)
    }

    return NextResponse.json({ sentence }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['teacher', 'admin'] })
