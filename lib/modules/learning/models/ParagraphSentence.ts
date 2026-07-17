import mongoose, { Schema } from 'mongoose'
import type { IParagraphSentence } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const ParagraphSentenceSchema = new Schema<IParagraphSentence>(
  {
    ...BaseEntityFields,
    paragraphId: { type: Schema.Types.ObjectId, required: true, index: true },
    sentenceId: { type: Schema.Types.ObjectId, required: true, index: true },
    order: { type: Number, required: true, min: 0 },
  },
  BaseEntityOptions
)

ParagraphSentenceSchema.index({ paragraphId: 1, sentenceId: 1 }, { unique: true })
ParagraphSentenceSchema.index({ paragraphId: 1, order: 1 })

export const ParagraphSentence =
  mongoose.models.ParagraphSentence ??
  mongoose.model<IParagraphSentence>('ParagraphSentence', ParagraphSentenceSchema)
