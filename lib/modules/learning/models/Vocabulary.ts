import mongoose, { Schema } from 'mongoose'
import type { IVocabulary } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const VocabularySchema = new Schema<IVocabulary>(
  {
    ...BaseEntityFields,
    lemma: {
      type: String,
      required: true,
      trim: true,
      set: function (this: any, val: string) {
        if (typeof val === 'string') {
          this.normalizedLemma = val
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
        }
        return val
      },
    },
    normalizedLemma: { type: String, required: true, lowercase: true, trim: true, index: true },
    display: { type: String, required: true, trim: true },
    ipa: { type: String, default: null },
    definition: { type: String, required: true },
    partOfSpeech: {
      type: String,
      enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection'],
      required: true,
    },
    examples: [{ type: String }],
    // DomainMetadata
    languageId: { type: Schema.Types.ObjectId, required: true, index: true },
    languageCode: { type: String, default: null },
    topicId: { type: Schema.Types.ObjectId, default: null, index: true },
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

VocabularySchema.index({ lemma: 1, languageId: 1 }, { unique: true })
VocabularySchema.index({ languageId: 1, cefrLevel: 1, difficulty: 1 })
VocabularySchema.index({ lemma: 'text', definition: 'text', examples: 'text' })
VocabularySchema.index({ normalizedLemma: 1, languageId: 1 })

VocabularySchema.pre('validate', function () {
  if (this.lemma) {
    this.normalizedLemma = this.lemma
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }
})

// Atlas Search definition (static, dùng để reference khi deploy index)
;(VocabularySchema as any).statics.searchIndexDefinition = {
  mappings: {
    dynamic: false,
    fields: {
      lemma: [{ type: 'string', analyzer: 'lucene.standard' }, { type: 'autocomplete' }],
      normalizedLemma: [{ type: 'string', analyzer: 'lucene.standard' }],
      definition: [{ type: 'string', analyzer: 'lucene.standard' }],
      searchKeywords: [{ type: 'string', analyzer: 'lucene.standard' }],
      languageId: [{ type: 'objectId' }],
      cefrLevel: [{ type: 'string' }],
      partOfSpeech: [{ type: 'string' }],
    },
  },
}

export const Vocabulary =
  mongoose.models.Vocabulary ??
  mongoose.model<IVocabulary>('Vocabulary', VocabularySchema)
