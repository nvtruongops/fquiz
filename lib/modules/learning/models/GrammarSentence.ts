import mongoose, { Schema } from 'mongoose'
import type { IGrammarSentence } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const GrammarSentenceSchema = new Schema<IGrammarSentence>(
  {
    ...BaseEntityFields,
    sentenceId: { type: Schema.Types.ObjectId, required: true, index: true },
    grammarId: { type: Schema.Types.ObjectId, required: true, index: true },
    startOffset: { type: Number, required: true },
    endOffset: { type: Number, required: true },
    matchedText: { type: String, default: null },
    confidence: { type: Number, min: 0, max: 1, default: null },
    explanation: { type: String, default: null },
  },
  BaseEntityOptions
)

GrammarSentenceSchema.index({ sentenceId: 1, grammarId: 1 }, { unique: true })

export const GrammarSentence =
  mongoose.models.GrammarSentence ??
  mongoose.model<IGrammarSentence>('GrammarSentence', GrammarSentenceSchema)
