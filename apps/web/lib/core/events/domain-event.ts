import { Types } from 'mongoose'

/**
 * IDomainEvent — Chuẩn hóa Domain Event.
 * Domain Event = internal aggregate change.
 * Integration Event = external system notification.
 *
 * eventId: UUID
 * eventType: 'VocabularyCreated' | 'LessonCompleted' | ...
 * occurredAt: timestamp
 * aggregateId: ID của entity phát sinh event
 * aggregateType: 'Vocabulary' | 'Lesson' | ...
 * payload: dữ liệu thay đổi
 */

export interface IDomainEvent<T = unknown> {
  eventId: string
  eventType: string
  occurredAt: Date
  aggregateId: Types.ObjectId
  aggregateType: string
  payload: T
}

/** Domain Events — internal aggregate changes */
export type DomainEventType =
  | 'VocabularyCreated'
  | 'VocabularyUpdated'
  | 'VocabularyVerified'
  | 'SentenceCreated'
  | 'SentenceVerified'
  | 'ParagraphCreated'
  | 'LessonCompleted'
  | 'ProgressUpdated'

/** Integration Events — external system notifications */
export type IntegrationEventType =
  | 'AIRequested'
  | 'AIGenerated'
  | 'AISaved'
  | 'EmailSent'
  | 'NotificationCreated'

export type EventHandler<T = unknown> = (event: IDomainEvent<T>) => void | Promise<void>
