import { LearningProgress } from '@/lib/modules/learning/models/LearningProgress'
import type { ILearningProgress, LearningObjectType } from '@/lib/modules/learning/types/learning'

export interface DetailedAnalytics {
  summary: { total: number; mastered: number; inProgress: number; due: number }
  byType: Array<{ loType: string; total: number; mastered: number; inProgress: number; due: number }>
  masteryDistribution: Array<{ range: string; min: number; count: number }>
}

export class LearningProgressRepository {
  async findByUser(userId: string): Promise<ILearningProgress[]> {
    return LearningProgress.find({ userId, status: { $ne: 'deleted' } }).lean()
  }

  async findDueReviews(userId: string, limit = 50): Promise<ILearningProgress[]> {
    return LearningProgress.find({
      userId,
      status: 'published',
      nextReviewAt: { $lte: new Date() },
    }).sort({ nextReviewAt: 1 }).limit(limit).lean()
  }

  async findByUserAndLO(
    userId: string, learningObjectId: string, loType: LearningObjectType, version: number
  ): Promise<ILearningProgress | null> {
    return LearningProgress.findOne({
      userId, learningObjectId, loType, learningObjectVersion: version,
    }).lean()
  }

  async upsert(
    userId: string, learningObjectId: string, loType: LearningObjectType,
    version: number, data: Partial<ILearningProgress>
  ): Promise<ILearningProgress> {
    return LearningProgress.findOneAndUpdate(
      { userId, learningObjectId, loType, learningObjectVersion: version },
      { $set: data, $setOnInsert: { schemaVersion: 1, contentVersion: 1, metadata: {} } },
      { upsert: true, new: true }
    ).lean()
  }

  async getMasteryStats(userId: string, loType?: LearningObjectType): Promise<{ total: number; mastered: number }> {
    const filter: Record<string, unknown> = { userId, status: 'published' }
    if (loType) filter.loType = loType
    const [total, mastered] = await Promise.all([
      LearningProgress.countDocuments(filter),
      LearningProgress.countDocuments({ ...filter, masteryLevel: { $gte: 80 } }),
    ])
    return { total, mastered }
  }

  async getDetailedAnalytics(userId: string): Promise<DetailedAnalytics> {
    const allItems = await LearningProgress.find({
      userId,
      status: 'published',
    }).lean()

    const now = new Date()
    const loTypes = ['vocabulary', 'grammar', 'sentence'] as const

    const byType = loTypes.map((loType) => {
      const items = allItems.filter((i) => i.loType === loType)
      return {
        loType,
        total: items.length,
        mastered: items.filter((i) => i.masteryLevel >= 80).length,
        inProgress: items.filter((i) => i.masteryLevel > 0 && i.masteryLevel < 80).length,
        due: items.filter((i) => i.nextReviewAt && i.nextReviewAt <= now).length,
      }
    })

    const sum = (fn: (t: typeof byType[0]) => number) => byType.reduce((a, t) => a + fn(t), 0)

    const masteryRanges = [
      { range: '0%', min: 0, max: 0 },
      { range: '1-20%', min: 1, max: 20 },
      { range: '21-40%', min: 21, max: 40 },
      { range: '41-60%', min: 41, max: 60 },
      { range: '61-80%', min: 61, max: 80 },
      { range: '81-99%', min: 81, max: 99 },
      { range: '100%', min: 100, max: 100 },
    ]

    const masteryDistribution = masteryRanges.map((r) => ({
      range: r.range,
      min: r.min,
      count: allItems.filter((i) => i.masteryLevel >= r.min && i.masteryLevel <= r.max).length,
    }))

    return {
      summary: {
        total: sum((t) => t.total),
        mastered: sum((t) => t.mastered),
        inProgress: sum((t) => t.inProgress),
        due: sum((t) => t.due),
      },
      byType,
      masteryDistribution,
    }
  }
}
