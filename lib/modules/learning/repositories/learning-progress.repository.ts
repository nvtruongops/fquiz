import { LearningProgress } from '@/lib/modules/learning/models/LearningProgress'
import type { ILearningProgress, LearningObjectType } from '@/lib/modules/learning/types/learning'

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
}
