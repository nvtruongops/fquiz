import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { LearningProgress } from '@/lib/modules/learning/models/LearningProgress'
import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
import { Sentence } from '@/lib/modules/learning/models/Sentence'
import { GrammarPattern } from '@/lib/modules/learning/models/GrammarPattern'
import { Language } from '@/lib/modules/learning/models/Language'
import type { LearningObjectType } from '@/lib/modules/learning/types/learning'
import type { JWTPayload } from '@/lib/modules/auth/auth'

export interface SavedItem {
  progressId: string
  learningObjectId: string
  loType: LearningObjectType
  front: string
  back: string
  examples?: string[]
  cefrLevel?: string
  masteryLevel: number
  reviewCount: number
  nextReviewAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * GET /api/v1/learning/saved-items
 * Retrieves all saved learning items (vocabulary, sentence, grammar) for the current student.
 * Supports filtering by loType, search, and languageCode.
 */
export const GET = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      await connectDB()

      const url = new URL(req.url)
      const loTypeFilter = url.searchParams.get('loType') as LearningObjectType | null
      const languageCode = url.searchParams.get('languageCode') || url.searchParams.get('language')
      const searchQuery = url.searchParams.get('search')?.trim().toLowerCase() || ''
      const limit = Number(url.searchParams.get('limit')) || 200

      const queryFilter: Record<string, unknown> = {
        userId: payload.userId,
        status: { $ne: 'deleted' },
      }

      if (loTypeFilter) {
        queryFilter.loType = loTypeFilter
      }

      const allProgress = await LearningProgress.find(queryFilter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean()

      if (!allProgress || allProgress.length === 0) {
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

      for (const item of allProgress) {
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

      const resultItems: SavedItem[] = []

      for (const item of allProgress) {
        const id = item.learningObjectId.toString()
        let front = ''
        let back = ''
        let examples: string[] | undefined = []
        let cefrLevel: string | undefined = undefined

        if (item.loType === 'vocabulary') {
          const doc = vocabMap.get(id)
          if (!doc) continue
          front = doc.display || doc.lemma
          back = `${doc.partOfSpeech ? `(${doc.partOfSpeech}) ` : ''}${doc.definition}`
          examples = doc.examples
          cefrLevel = doc.cefrLevel
        } else if (item.loType === 'sentence') {
          const doc = sentenceMap.get(id)
          if (!doc) continue
          front = doc.text
          back = doc.translation || doc.text
          cefrLevel = doc.difficulty
        } else if (item.loType === 'grammar') {
          const doc = grammarMap.get(id)
          if (!doc) continue
          front = doc.pattern
          back = doc.explanation
          examples = doc.examples
          cefrLevel = doc.cefrLevel
        } else {
          continue
        }

        if (
          searchQuery &&
          !front.toLowerCase().includes(searchQuery) &&
          !back.toLowerCase().includes(searchQuery)
        ) {
          continue
        }

        resultItems.push({
          progressId: item._id.toString(),
          learningObjectId: id,
          loType: item.loType,
          front,
          back,
          examples,
          cefrLevel,
          masteryLevel: item.masteryLevel || 0,
          reviewCount: item.reviewCount || 0,
          nextReviewAt: item.nextReviewAt ? item.nextReviewAt.toISOString() : null,
          createdAt: (item as any).createdAt ? new Date((item as any).createdAt).toISOString() : new Date().toISOString(),
          updatedAt: (item as any).updatedAt ? new Date((item as any).updatedAt).toISOString() : new Date().toISOString(),
        })
      }

      return NextResponse.json({
        items: resultItems,
        total: resultItems.length,
      })
    } catch (err: any) {
      console.error('[API /api/v1/learning/saved-items] Error:', err)
      return NextResponse.json(
        { error: err.message || 'Lỗi lấy danh sách bài học đã lưu' },
        { status: 500 }
      )
    }
  },
  { roles: ['student', 'teacher', 'admin'] }
)
