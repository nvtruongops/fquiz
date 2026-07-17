import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
import { Sentence } from '@/lib/modules/learning/models/Sentence'
import { GrammarPattern } from '@/lib/modules/learning/models/GrammarPattern'
import type { LearningProgressService } from '@/lib/modules/learning/services/learning-progress.service'
import type { LearningObjectType } from '@/lib/modules/learning/types/learning'
import type { JWTPayload } from '@/lib/modules/auth/auth'

interface FlashcardItem {
  progressId: string
  front: string
  back: string
  loType: LearningObjectType
  learningObjectId: string
  version: number
  masteryLevel: number
  reviewCount: number
  nextReviewAt: string | null
  retrievability?: number
}

export const GET = withAuth(async (req, { payload }: { payload: JWTPayload }) => {
  try {
    await connectDB()
    const loType = new URL(req.url).searchParams.get('loType') as LearningObjectType | null
    const limit = Number(new URL(req.url).searchParams.get('limit')) || 50

    const progressService = container.resolve<LearningProgressService>('LearningProgressService')
    const dueItems = await progressService.getDueReviews(payload.userId, limit)

    let filtered = dueItems
    if (loType) {
      filtered = dueItems.filter((item) => item.loType === loType)
    }

    if (filtered.length === 0) {
      return NextResponse.json({ items: [], total: 0 })
    }

    const vocabIds: string[] = []
    const sentenceIds: string[] = []
    const grammarIds: string[] = []

    for (const item of filtered) {
      const id = item.learningObjectId.toString()
      if (item.loType === 'vocabulary') vocabIds.push(id)
      else if (item.loType === 'sentence') sentenceIds.push(id)
      else if (item.loType === 'grammar') grammarIds.push(id)
    }

    const [vocabDocs, sentenceDocs, grammarDocs] = await Promise.all([
      vocabIds.length ? Vocabulary.find({ _id: { $in: vocabIds } }).lean() : [],
      sentenceIds.length ? Sentence.find({ _id: { $in: sentenceIds } }).lean() : [],
      grammarIds.length ? GrammarPattern.find({ _id: { $in: grammarIds } }).lean() : [],
    ])

    const vocabMap = new Map(vocabDocs.map((d) => [d._id.toString(), d]))
    const sentenceMap = new Map(sentenceDocs.map((d) => [d._id.toString(), d]))
    const grammarMap = new Map(grammarDocs.map((d) => [d._id.toString(), d]))

    const items: FlashcardItem[] = []

    for (const item of filtered) {
      const id = item.learningObjectId.toString()
      let front = ''
      let back = ''

      if (item.loType === 'vocabulary') {
        const doc = vocabMap.get(id)
        if (!doc) continue
        front = doc.lemma
        back = `${doc.definition}${doc.examples?.length ? '\n\nExamples:\n' + doc.examples.join('\n') : ''}`
      } else if (item.loType === 'sentence') {
        const doc = sentenceMap.get(id)
        if (!doc) continue
        front = doc.text
        back = doc.translation ?? doc.text
      } else if (item.loType === 'grammar') {
        const doc = grammarMap.get(id)
        if (!doc) continue
        front = doc.pattern
        back = `${doc.explanation}${doc.examples?.length ? '\n\nExamples:\n' + doc.examples.join('\n') : ''}`
      } else {
        continue
      }

      const fsrsState = item.strategyState as Record<string, unknown> | undefined
      const retrievability = fsrsState?.stability && fsrsState?.elapsedDays
        ? Math.pow(1 + ((fsrsState.elapsedDays as number) / (fsrsState.stability as number)), -1)
        : undefined

      items.push({
        progressId: item._id.toString(),
        front,
        back,
        loType: item.loType,
        learningObjectId: id,
        version: item.learningObjectVersion,
        masteryLevel: item.masteryLevel,
        reviewCount: item.reviewCount,
        nextReviewAt: item.nextReviewAt?.toISOString() ?? null,
        retrievability,
      })
    }

    return NextResponse.json({ items, total: items.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}, { roles: ['student', 'teacher', 'admin'] })
