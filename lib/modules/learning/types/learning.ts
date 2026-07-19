import { Types } from 'mongoose'
import type { IBaseEntity } from '@/lib/core/types/base-entity'
import type { CEFRLevel, IDomainMetadata, IAIMetadata, ISearchMetadata } from '@/lib/core/types/domain-metadata'

// ============================================================
// Language
// ============================================================
export interface ILanguage extends IBaseEntity {
  code: string                  // ISO 639-1: 'en', 'vi', 'ja', 'ko', 'zh'
  name: string                  // 'English'
  nativeName: string            // 'English'
  direction: 'ltr' | 'rtl'
  locale?: string               // 'en-US', 'vi-VN', 'ja-JP' — for TTS, AI, formatting
}

// ============================================================
// Topic
// ============================================================
export interface ITopic extends IBaseEntity {
  name: string
  slug: string
  icon?: string
  parentTopicId?: Types.ObjectId
  path: string                    // 'travel/airport/check-in' — materialized path for fast search
  tags?: string[]                 // Keywords / context tags for AI generation
}

// ============================================================
// Course
// ============================================================
export interface ICourse extends IBaseEntity, IDomainMetadata {
  title: string
  description?: string
  prerequisites?: Types.ObjectId[]
  publishedVersion: number        // Version hiển thị cho học viên
  draftVersion: number            // Version đang chỉnh sửa (draft > published = có update pending)
}

// ============================================================
// Module
// ============================================================
export interface IModule extends IBaseEntity {
  title: string
  order: number
  courseId: Types.ObjectId
  unlockAfterModuleId?: Types.ObjectId | null
}

// ============================================================
// Lesson
// ============================================================
export interface ILesson extends IBaseEntity {
  title: string
  objective?: string               // Mô tả ngắn cho UI
  learningObjective?: string       // Mục tiêu học tập chi tiết — AI-readable
  moduleId: Types.ObjectId
  order: number
  prerequisites?: Types.ObjectId[]
  cefrLevel?: CEFRLevel
  estimatedMinutes?: number
}

// ============================================================
// Paragraph
// ============================================================
export interface IParagraph extends IBaseEntity, IDomainMetadata, ISearchMetadata, IAIMetadata {
  title?: string
  content: string
  lessonId: Types.ObjectId
  order: number
  wordCount: number
}

// ============================================================
// Sentence
// ============================================================
export interface ISentence extends IBaseEntity, IDomainMetadata, ISearchMetadata, IAIMetadata {
  text: string
  normalizedText: string
  checksum: string
  translation?: string
}

// ============================================================
// SentenceVocabulary — JOIN TABLE
// ============================================================
export interface ISentenceVocabulary extends IBaseEntity {
  sentenceId: Types.ObjectId
  vocabularyId: Types.ObjectId
  senseId?: string | null
  position?: number
  meaningInContext?: string
  relationType?: string
}

// ============================================================
// GrammarSentence — JOIN TABLE (thay vì grammarIds[] trên Sentence)
// ============================================================
export interface IGrammarSentence extends IBaseEntity {
  sentenceId: Types.ObjectId
  grammarId: Types.ObjectId
  startOffset: number
  endOffset: number
  matchedText?: string                     // Text khớp với pattern
  confidence?: number                      // 0-1 AI confidence
  explanation?: string                     // Giải thích trong ngữ cảnh
}

// ============================================================
// Vocabulary
// ============================================================
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'interjection'

export interface IVocabulary extends IBaseEntity, IDomainMetadata, ISearchMetadata, IAIMetadata {
  lemma: string
  normalizedLemma: string
  display: string
  ipa?: string
  definition: string
  partOfSpeech: PartOfSpeech
  examples: string[]
}

// ============================================================
// GrammarPattern
// ============================================================
export interface IGrammarPattern extends IBaseEntity, IDomainMetadata, ISearchMetadata, IAIMetadata {
  name: string
  pattern: string
  formula?: string
  explanation: string
  examples: string[]
}

// ============================================================
// Flashcard
// ============================================================
export type CardType = 'vocabulary' | 'grammar' | 'sentence' | 'cloze'
export type LearningStrategy = 'fsrs' | 'sm2' | 'manual' | 'ai'

export interface IFSRSState {
  stability: number
  difficulty: number
  retrievability?: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  lastReview?: Date
  nextReview: Date
  state: 'new' | 'learning' | 'review' | 'relearning'
}

export interface IFlashcard extends IBaseEntity, IDomainMetadata, ISearchMetadata {
  front: string
  back: string
  frontRich?: string
  backRich?: string
  cardType: CardType
  sourceType: 'vocabulary' | 'grammar' | 'sentence' | 'lesson'
  sourceId: Types.ObjectId
  ownerId?: Types.ObjectId | null
  isPublic: boolean
  learningStrategy: LearningStrategy
  fsrsState?: IFSRSState
}

// ============================================================
// ParagraphSentence — JOIN TABLE
// ============================================================
export interface IParagraphSentence extends IBaseEntity {
  paragraphId: Types.ObjectId
  sentenceId: Types.ObjectId
  order: number
}

// ============================================================
// LearningProgress (Phase 2.1)
// ============================================================
export type LearningObjectType = 'vocabulary' | 'grammar' | 'sentence' | 'lesson'

export interface ILearningProgress extends IBaseEntity {
  userId: Types.ObjectId
  learningObjectId: Types.ObjectId
  loType: LearningObjectType
  learningObjectVersion: number       // Version của LO khi user học
  learningStrategy: LearningStrategy  // KHÔNG hardcode FSRS
  strategyState: Record<string, unknown>  // Generic state — fsrs/sm2/ai đều dùng
  masteryLevel: number                // 0-100
  reviewCount: number
  firstReviewedAt?: Date
  lastReviewedAt?: Date
  nextReviewAt?: Date
  completedAt?: Date
  lastResult?: 'correct' | 'incorrect' | 'partial'
}

// ============================================================
// AIAsset
// ============================================================
export type AIAssetStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface IAIAsset extends Omit<IBaseEntity, 'status'> {
  sourceType: string
  sourceId: Types.ObjectId
  requestHash: string
  responseHash: string
  prompt: string
  promptVersion: string
  aiProvider: string
  aiModel: string
  providerRequestId?: string
  providerResponseId?: string
  status: AIAssetStatus
  errorMessage?: string
  retryCount: number
  requestTokens?: number
  responseTokens?: number
  cost?: number
  durationMs?: number
}

// ============================================================
// LearningTag — Shared tag system
// ============================================================
export interface ILearningTag extends IBaseEntity {
  name: string
  slug: string
  group?: string
  color?: string
  icon?: string
  isSystem: boolean
}


