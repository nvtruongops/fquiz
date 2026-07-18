import { LearningProgressRepository } from '@/lib/modules/learning/repositories/learning-progress.repository'
import type { ILearningProgress, LearningObjectType, LearningStrategy } from '@/lib/modules/learning/types/learning'
import type { IFSRSState } from '@/lib/modules/learning/types/learning'
import { reviewEngine } from '@/lib/modules/learning/review-engine'

export interface ReviewResult {
  learningObjectId: string
  loType: LearningObjectType
  version: number
  result: 'correct' | 'incorrect' | 'partial'
}

const GRADE_MAP: Record<string, number> = {
  correct: 3,
  partial: 2,
  incorrect: 1,
}

export class LearningProgressService {
  constructor(private progressRepo: LearningProgressRepository) {}

  async getDueReviews(userId: string, limit = 50): Promise<ILearningProgress[]> {
    return this.progressRepo.findDueReviews(userId, limit)
  }

  async getStats(userId: string, loType?: LearningObjectType) {
    return this.progressRepo.getMasteryStats(userId, loType)
  }

  async getDetailedAnalytics(userId: string) {
    return this.progressRepo.getDetailedAnalytics(userId)
  }

  async recordReview(userId: string, review: ReviewResult, strategy: LearningStrategy): Promise<ILearningProgress> {
    const existing = await this.progressRepo.findByUserAndLO(
      userId, review.learningObjectId, review.loType, review.version
    )

    const prevCount = existing?.reviewCount || 0
    const prevState = existing?.strategyState as IFSRSState | undefined

    const { fsrsState, newMastery } = strategy === 'fsrs'
      ? this.calculateFsrsReview(prevState, review.result)
      : this.calculateSimpleReview(prevState, prevCount, existing?.masteryLevel || 0, review.result)

    return this.progressRepo.upsert(userId, review.learningObjectId, review.loType, review.version, {
      learningStrategy: strategy,
      strategyState: fsrsState as unknown as Record<string, unknown>,
      masteryLevel: newMastery,
      reviewCount: prevCount + 1,
      firstReviewedAt: existing?.firstReviewedAt || new Date(),
      lastReviewedAt: new Date(),
      nextReviewAt: fsrsState.nextReview,
      completedAt: newMastery >= 100 ? new Date() : undefined,
      lastResult: review.result,
    })
  }

  private calculateFsrsReview(prevState: IFSRSState | undefined, result: 'correct' | 'incorrect' | 'partial') {
    const current = prevState ?? reviewEngine.getInitialState()
    const grade = GRADE_MAP[result] ?? 1
    const fsrsState = reviewEngine.calculateNext(current, grade)
    let newMastery = Math.round(fsrsState.stability * 10)
    if (newMastery > 100) newMastery = 100
    if (newMastery < 0) newMastery = 0
    return { fsrsState, newMastery }
  }

  private calculateSimpleReview(
    prevState: IFSRSState | undefined,
    prevCount: number,
    currentMastery: number,
    result: 'correct' | 'incorrect' | 'partial'
  ) {
    const existingState = prevState ?? reviewEngine.getInitialState()
    const delta = result === 'correct' ? 15 : result === 'partial' ? 5 : -10
    const newMastery = Math.max(0, Math.min(100, currentMastery + delta))
    const days = result === 'correct' ? (prevCount + 1) * 1.5 : 1
    const fsrsState: IFSRSState = {
      ...existingState,
      stability: newMastery / 10,
      difficulty: 5,
      elapsedDays: existingState.elapsedDays + (existingState.scheduledDays || 1),
      scheduledDays: days,
      reps: prevCount + 1,
      lapses: result === 'incorrect' ? existingState.lapses + 1 : existingState.lapses,
      lastReview: new Date(),
      nextReview: new Date(Date.now() + days * 86400000),
      state: result === 'incorrect' ? 'relearning' : 'review',
    }
    return { fsrsState, newMastery }
  }
}
