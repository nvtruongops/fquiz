import mongoose, { Schema } from 'mongoose'
import crypto from 'crypto'
import type { ISentence } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

function normalizeForChecksum(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

const SentenceSchema = new Schema<ISentence>(
  {
    ...BaseEntityFields,
    text: {
      type: String,
      required: true,
      set: function (this: any, val: string) {
        if (typeof val === 'string') {
          this.normalizedText = normalizeForChecksum(val)
          this.checksum = crypto.createHash('sha256').update(this.normalizedText).digest('hex').substring(0, 20)
        }
        return val
      },
    },
    normalizedText: { type: String, required: true, index: true },
    checksum: { type: String, required: true },
    translation: { type: String, default: null },
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

SentenceSchema.index({ checksum: 1, languageId: 1 }, { unique: true })
SentenceSchema.index({ languageId: 1, cefrLevel: 1 })
SentenceSchema.index({ text: 'text', translation: 'text' })

SentenceSchema.pre('validate', function () {
  if (this.text) {
    this.normalizedText = normalizeForChecksum(this.text)
    this.checksum = crypto.createHash('sha256').update(this.normalizedText).digest('hex').substring(0, 20)
  }
})

;(SentenceSchema as any).statics.searchIndexDefinition = {
  mappings: {
    dynamic: false,
    fields: {
      text: [{ type: 'string', analyzer: 'lucene.standard' }],
      normalizedText: [{ type: 'string', analyzer: 'lucene.standard' }],
      translation: [{ type: 'string', analyzer: 'lucene.standard' }],
      searchKeywords: [{ type: 'string', analyzer: 'lucene.standard' }],
      languageId: [{ type: 'objectId' }],
      cefrLevel: [{ type: 'string' }],
    },
  },
}

export const Sentence =
  mongoose.models.Sentence ??
  mongoose.model<ISentence>('Sentence', SentenceSchema)
