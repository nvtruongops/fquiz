import mongoose, { Schema } from 'mongoose'
import type { IGrammarPattern } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const GrammarPatternSchema = new Schema<IGrammarPattern>(
  {
    ...BaseEntityFields,
    name: { type: String, required: true, trim: true },
    pattern: { type: String, required: true },
    formula: { type: String, default: null },
    explanation: { type: String, required: true },
    examples: [{ type: String }],
    // DomainMetadata
    languageId: { type: Schema.Types.ObjectId, required: true, index: true },
    languageCode: { type: String, default: null },
    topicId: { type: Schema.Types.ObjectId, default: null },
    cefrLevel: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], default: null },
    difficulty: { type: Number, min: 1, max: 10, default: null },
    frequency: { type: Number, default: null },
    tags: [{ type: Schema.Types.ObjectId }],
    source: { type: String, enum: ['manual', 'ai_generated', 'imported', 'seed', 'user_created'], default: 'manual' },
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, default: null },
    verifiedAt: { type: Date, default: null },
    // SearchMetadata
    normalizedText: { type: String, default: null },
    searchKeywords: [{ type: String }],
    embeddingId: { type: Schema.Types.ObjectId, default: null },
    embeddingModel: { type: String, default: null },
    isSearchable: { type: Boolean, default: true },
    atlasIndexed: { type: Boolean, default: false },
    // AIMetadata
    aiProvider: { type: String, default: null },
    aiModel: { type: String, default: null },
    aiPromptVersion: { type: String, default: null },
    aiGeneratedBy: { type: Schema.Types.ObjectId, default: null },
    aiGeneratedAt: { type: Date, default: null },
    aiVerified: { type: Boolean, default: false },
    aiReviewStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'edited'], default: 'pending' },
    aiGenerationType: { type: String, default: null },
    aiAssetId: { type: Schema.Types.ObjectId, default: null },
    aiConfidence: { type: Number, default: null },
  },
  BaseEntityOptions
)

GrammarPatternSchema.index({ name: 1, languageId: 1 }, { unique: true })
GrammarPatternSchema.index({ languageId: 1, cefrLevel: 1 })
GrammarPatternSchema.index({ name: 'text', explanation: 'text', examples: 'text' })

;(GrammarPatternSchema as any).statics.searchIndexDefinition = {
  mappings: {
    dynamic: false,
    fields: {
      name: [{ type: 'string', analyzer: 'lucene.standard' }],
      pattern: [{ type: 'string', analyzer: 'lucene.standard' }],
      explanation: [{ type: 'string', analyzer: 'lucene.standard' }],
      languageId: [{ type: 'objectId' }],
      cefrLevel: [{ type: 'string' }],
    },
  },
}

export const GrammarPattern =
  mongoose.models.GrammarPattern ??
  mongoose.model<IGrammarPattern>('GrammarPattern', GrammarPatternSchema)
