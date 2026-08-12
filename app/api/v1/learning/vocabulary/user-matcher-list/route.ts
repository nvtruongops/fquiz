import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { LearningProgress } from '@/lib/modules/learning/models/LearningProgress'
import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
import type { JWTPayload } from '@/lib/modules/auth/auth'

export interface UserMatcherItem {
  vocabularyId: string
  expression: string
  normalizedExpression: string
  display: string
  translation?: string
  ipa?: string
  partOfSpeech?: string
  contextSentence?: string
  personalNote?: string
  reviewStatus: 'saved' | 'needs_review' | 'temp'
}

/**
 * GET /api/v1/learning/vocabulary/user-matcher-list
 * Trả về danh sách tất cả từ vựng/cụm từ mà học viên hiện tại đã lưu
 * cùng với trạng thái FSRS (needs_review hay saved) để client thực hiện matching.
 */
export const GET = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      await connectDB()

      const now = new Date()
      const progressList = await LearningProgress.find({
        userId: payload.userId,
        loType: 'vocabulary',
        status: { $ne: 'deleted' },
      })
        .select('_id learningObjectId nextReviewAt masteryLevel userContext')
        .lean()

      if (!progressList || progressList.length === 0) {
        return NextResponse.json({ items: [] })
      }

      const vocabIds = progressList.map((p) => p.learningObjectId.toString())
      const vocabDocs = await Vocabulary.find({ _id: { $in: vocabIds } })
        .select('_id lemma display ipa definition partOfSpeech')
        .lean()

      const vocabMap = new Map(vocabDocs.map((v) => [v._id.toString(), v]))

      const items: UserMatcherItem[] = []

      for (const p of progressList) {
        const vId = p.learningObjectId.toString()
        const vocabDoc = vocabMap.get(vId)

        const rawExpression = (p as any).userContext?.expression || vocabDoc?.display || vocabDoc?.lemma
        if (!rawExpression) continue

        const normalized = (p as any).userContext?.normalizedExpression || rawExpression.toLowerCase().trim()
        const isNeedsReview = Boolean(p.nextReviewAt && new Date(p.nextReviewAt) <= now)

        items.push({
          vocabularyId: vId,
          expression: rawExpression,
          normalizedExpression: normalized,
          display: vocabDoc?.display || rawExpression,
          translation: (p as any).userContext?.customTranslation || vocabDoc?.definition || '',
          ipa: vocabDoc?.ipa || '',
          partOfSpeech: vocabDoc?.partOfSpeech || 'noun',
          contextSentence: (p as any).userContext?.contextSentence || '',
          personalNote: (p as any).userContext?.personalNote || '',
          reviewStatus: isNeedsReview ? 'needs_review' : 'saved',
        })
      }

      return NextResponse.json({ items })
    } catch (err: any) {
      console.error('[API user-matcher-list] Error:', err)
      return NextResponse.json(
        { error: err.message || 'Lỗi lấy danh sách từ vựng cá nhân' },
        { status: 500 }
      )
    }
  },
  { roles: ['student', 'teacher', 'admin'] }
)
