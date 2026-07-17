import { LearningProgressRepository } from '@/lib/modules/learning/repositories/learning-progress.repository'
import type { ILearningProgress, LearningObjectType, LearningStrategy } from '@/lib/modules/learning/types/learning'

export interface ReviewResult {
  learningObjectId: string
  loType: LearningObjectType
  version: number
  result: 'correct' | 'incorrect' | 'partial'
}

export class LearningProgressService {
  constructor(private progressRepo: LearningProgressRepository) {}

  async getDueReviews(userId: string, limit = 50): Promise<ILearningProgress[]> {
    return this.progressRepo.findDueReviews(userId, limit)
  }

  async getStats(userId: string, loType?: LearningObjectType) {
    return this.progressRepo.getMasteryStats(userId, loType)
  }

  /** Ghi nhận kết quả 1 lần review — cập nhật masteryLevel + strategyState */
  async recordReview(userId: string, review: ReviewResult, strategy: LearningStrategy): Promise<ILearningProgress> {
    const existing = await this.progressRepo.findByUserAndLO(
      userId, review.learningObjectId, review.loType, review.version
    )

    const prevState = (existing?.strategyState || {}) as Record<string, unknown>
    const prevMastery = existing?.masteryLevel || 0
    const prevCount = existing?.reviewCount || 0

    // Simple mastery adjustment (FSRS/SM2 will replace this later)
    const delta = review.result === 'correct' ? 15 : review.result === 'partial' ? 5 : -10
    const newMastery = Math.max(0, Math.min(100, prevMastery + delta))

    // Basic SM2-like spacing
    const days = review.result === 'correct' ? (prevCount + 1) * 1.5 : 1
    const nextReview = new Date(Date.now() + days * 86400000)

    return this.progressRepo.upsert(userId, review.learningObjectId, review.loType, review.version, {
      learningStrategy: strategy,
      strategyState: { ...prevState, lastDelta: delta },
      masteryLevel: newMastery,
      reviewCount: prevCount + 1,
      firstReviewedAt: existing?.firstReviewedAt || new Date(),
      lastReviewedAt: new Date(),
      nextReviewAt: nextReview,
      completedAt: newMastery >= 100 ? new Date() : undefined,
      lastResult: review.result,
    })
  }
}
