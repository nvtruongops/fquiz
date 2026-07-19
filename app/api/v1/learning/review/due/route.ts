import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { container } from '@/lib/core/di'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
import { Sentence } from '@/lib/modules/learning/models/Sentence'
import { GrammarPattern } from '@/lib/modules/learning/models/GrammarPattern'
import { Language } from '@/lib/modules/learning/models/Language'
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

export const GET = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      await connectDB()

      const url = new URL(req.url)
      const loType = url.searchParams.get('loType') as LearningObjectType | null
      const languageCode = url.searchParams.get('languageCode') || url.searchParams.get('language')
      const limit = Number(url.searchParams.get('limit')) || 100

      const progressService = container.resolve<LearningProgressService>('LearningProgressService')
      const dueItems = await progressService.getDueReviews(payload.userId, limit)

      let filtered = dueItems
      if (loType) {
        filtered = dueItems.filter((item) => item.loType === loType)
      }

      if (filtered.length === 0) {
        return NextResponse.json({ items: [], total: 0 })
      }

      let langId: string | null = null
      if (languageCode && /^[a-zA-Z]{2,5}$/.test(languageCode)) {
        const code = languageCode.toLowerCase()
        const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const langDoc = await Language.findOne({
          $or: [
            { code },
            { name: { $regex: `^${escaped}$`, $options: 'i' } },
          ],
        }).lean()

        if (langDoc) {
          langId = langDoc._id.toString()
        }
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

      const vocabFilter: Record<string, unknown> = { _id: { $in: vocabIds } }
      const sentenceFilter: Record<string, unknown> = { _id: { $in: sentenceIds } }
      const grammarFilter: Record<string, unknown> = { _id: { $in: grammarIds } }

      if (langId) {
        vocabFilter.languageId = langId
        sentenceFilter.languageId = langId
        grammarFilter.languageId = langId
      }

      const [vocabDocs, sentenceDocs, grammarDocs] = await Promise.all([
        vocabIds.length ? Vocabulary.find(vocabFilter).lean() : [],
        sentenceIds.length ? Sentence.find(sentenceFilter).lean() : [],
        grammarIds.length ? GrammarPattern.find(grammarFilter).lean() : [],
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
    } catch (err: any) {
      console.error('[API /api/v1/learning/review/due] Error:', err)
      return NextResponse.json({ error: err.message || 'Error fetching due reviews' }, { status: 500 })
    }
  },
  { roles: ['student', 'teacher', 'admin'] }
)
