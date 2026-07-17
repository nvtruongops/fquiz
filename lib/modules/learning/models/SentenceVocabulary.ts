import mongoose, { Schema } from 'mongoose'
import type { ISentenceVocabulary } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const SentenceVocabularySchema = new Schema<ISentenceVocabulary>(
  {
    ...BaseEntityFields,
    sentenceId: { type: Schema.Types.ObjectId, required: true, index: true },
    vocabularyId: { type: Schema.Types.ObjectId, required: true, index: true },
    senseId: { type: String, default: null },
    position: { type: Number, default: null },
    meaningInContext: { type: String, default: null },
    relationType: { type: String, default: null },
  },
  BaseEntityOptions
)

SentenceVocabularySchema.index({ sentenceId: 1, vocabularyId: 1 }, { unique: true })

export const SentenceVocabulary =
  mongoose.models.SentenceVocabulary ??
  mongoose.model<ISentenceVocabulary>('SentenceVocabulary', SentenceVocabularySchema)
