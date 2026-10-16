import { Types } from 'mongoose'

// ============================================================
// Domain Metadata — Applies to Learning Objects
// ============================================================

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export type ContentSource = 'manual' | 'ai_generated' | 'imported' | 'seed' | 'user_created'

export interface IDomainMetadata {
  languageId: Types.ObjectId
  languageCode?: string          // 'en', 'vi', 'ja' — denormalized for fast query
  topicId?: Types.ObjectId
  cefrLevel?: CEFRLevel
  difficulty?: number            // 1-10
  frequency?: number             // word frequency rank
  tags?: Types.ObjectId[]        // ref: LearningTag — shared tag system
  source: ContentSource          // Data source origin
  isVerified?: boolean
  verifiedBy?: Types.ObjectId
  verifiedAt?: Date
}

// ============================================================
// AI Metadata — Applies to AI-generated entities
// ============================================================

export type AIReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited'

export type AIGenerationType =
  | 'vocabulary'
  | 'sentence'
  | 'paragraph'
  | 'grammar'
  | 'quiz'
  | 'flashcard'
  | 'translation'
  | 'dialogue'
  | 'story'

export interface IAIMetadata {
  aiProvider: string
  aiModel: string
  aiPromptVersion: string
  aiGeneratedBy?: Types.ObjectId
  aiGeneratedAt: Date
  aiVerified: boolean
  aiReviewStatus: AIReviewStatus
  aiGenerationType: AIGenerationType
  aiAssetId?: Types.ObjectId
  aiConfidence?: number       // 0-1
}

// ============================================================
// Search Metadata — Applies to searchable entities
// ============================================================

export interface ISearchMetadata {
  normalizedText?: string
  searchKeywords?: string[]
  embeddingId?: Types.ObjectId
  embeddingModel?: string
  isSearchable: boolean
  atlasIndexed: boolean
}
