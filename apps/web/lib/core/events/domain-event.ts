import { Types } from 'mongoose'

/**
 * IDomainEvent — Standardized Domain Event.
 * Domain Event = internal aggregate change.
 * Integration Event = external system notification.
 *
 * eventId: UUID
 * eventType: 'VocabularyCreated' | 'LessonCompleted' | ...
 * occurredAt: timestamp
 * aggregateId: ID of entity raising the event
 * aggregateType: 'Vocabulary' | 'Lesson' | ...
 * payload: change data
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
