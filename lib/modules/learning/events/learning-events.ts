import { Types } from 'mongoose'

/**
 * Domain Event chuẩn hóa — dễ mở rộng lên Redis Streams, Kafka, QStash.
 * Mỗi event có: eventId, occurredAt, version, aggregateId, aggregateType.
 */

export interface IDomainEvent<T = unknown> {
  eventId: string                   // UUID
  eventType: string                 // 'VocabularyCreated', 'SentenceVerified', ...
  occurredAt: Date
  version: number                   // Event version (khác schemaVersion)
  aggregateId: Types.ObjectId       // ID của entity phát sinh event
  aggregateType: string             // 'Vocabulary' | 'Sentence' | 'Lesson' | ...
  payload: T                        // Dữ liệu thay đổi
}

// ============================================================
// Learning Event Types
// ============================================================

export interface VocabularyCreatedPayload {
  lemma: string
  languageId: string
  cefrLevel?: string
}

export interface SentenceVerifiedPayload {
  text: string
  languageId: string
}

export interface LessonCompletedPayload {
  userId: string
  lessonId: string
  score?: number
}

export interface AIAssetGeneratedPayload {
  assetId: string
  sourceType: string
  sourceId: string
  provider: string
  model: string
}

export type LearningEventType =
  | 'VocabularyCreated'
  | 'VocabularyUpdated'
  | 'VocabularyVerified'
  | 'SentenceCreated'
  | 'SentenceVerified'
  | 'ParagraphCreated'
  | 'LessonCompleted'
  | 'AIAssetGenerated'
  | 'AIAssetReused'

// ============================================================
// Simple Event Bus (in-memory, synchronous)
// ============================================================

type EventHandler<T = unknown> = (event: IDomainEvent<T>) => void | Promise<void>

class EventBus {
  private handlers = new Map<string, EventHandler[]>()

  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || []
    existing.push(handler)
    this.handlers.set(eventType, existing)
  }

  async emit<T>(event: IDomainEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || []
    for (const handler of handlers) {
      await handler(event)
    }
  }

  /** Remove all handlers (useful for testing) */
  reset(): void {
    this.handlers.clear()
  }
}

export const eventBus = new EventBus()
