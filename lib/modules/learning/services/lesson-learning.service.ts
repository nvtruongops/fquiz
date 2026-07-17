import type { LessonRepository } from '@/lib/modules/learning/repositories/lesson.repository'
import type { ParagraphRepository } from '@/lib/modules/learning/repositories/paragraph.repository'
import type { SentenceReadRepository } from '@/lib/modules/learning/repositories/sentence-read.repository'
import type { LearningProgressRepository } from '@/lib/modules/learning/repositories/learning-progress.repository'
import type { ICache } from '@/lib/core/cache'
import type { IEventBus } from '@/lib/core/events'

export interface LessonWithContent {
  lesson: Record<string, unknown>
  paragraphs: Array<{
    paragraph: Record<string, unknown>
    sentences: Array<Record<string, unknown>>
  }>
}

/**
 * LessonLearningService — Orchestration cho việc học một bài học.
 *
 * KHÔNG chứa business logic của Lesson/Paragraph/Sentence aggregate.
 * Chỉ orchestrate: load data → cache → return.
 */
export class LessonLearningService {
  constructor(
    private lessonRepo: LessonRepository,
    private paragraphRepo: ParagraphRepository,
    private sentenceReadRepo: SentenceReadRepository,
    private progressRepo: LearningProgressRepository,
    private cache: ICache,
    private eventBus: IEventBus,
  ) {}

  /** Load toàn bộ nội dung một bài học (lesson → paragraphs → sentences + vocab/grammar) */
  async loadLesson(userId: string, lessonId: string): Promise<LessonWithContent | null> {
    const cacheKey = `lesson:content:${lessonId}`
    const cached = await this.cache.get<LessonWithContent>(cacheKey)
    if (cached) return cached

    const lesson = await this.lessonRepo.findById(lessonId)
    if (!lesson) return null

    const paragraphs = await this.paragraphRepo.findByLesson(lessonId)
    const content: LessonWithContent = { lesson: lesson as any, paragraphs: [] }

    for (const para of paragraphs) {
      const sentences = await this.sentenceReadRepo.getParagraphSentencesWithRelations(para._id.toString())
      content.paragraphs.push({
        paragraph: para as any,
        sentences: sentences.map((s) => s.sentence),
      })
    }

    await this.cache.set(cacheKey, content, 600, ['lesson', `lesson:${lessonId}`])
    return content
  }

  /** Đánh dấu hoàn thành bài học → cập nhật progress → emit event */
  async completeLesson(userId: string, lessonId: string, lessonVersion: number): Promise<void> {
    await this.progressRepo.upsert(userId, lessonId, 'lesson', lessonVersion, {
      masteryLevel: 100,
      reviewCount: 1,
      lastReviewedAt: new Date(),
      completedAt: new Date(),
      lastResult: 'correct',
    })

    await this.eventBus.publishDomainEvent({
      eventId: `evt-${Date.now()}`,
      eventType: 'LessonCompleted',
      occurredAt: new Date(),
      aggregateId: lessonId as unknown as import('mongoose').Types.ObjectId,
      aggregateType: 'Lesson',
      payload: { userId, lessonId },
    })
  }
}
