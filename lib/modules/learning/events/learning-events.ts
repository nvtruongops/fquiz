import { Types } from 'mongoose'
import { eventBus as coreEventBus } from '@/lib/core/events/event-bus'
export type { IDomainEvent } from '@/lib/core/events/event-bus'

export const eventBus = coreEventBus

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