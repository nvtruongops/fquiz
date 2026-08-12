import mongoose, { Schema } from 'mongoose'
import type { ILearningProgress } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const LearningProgressSchema = new Schema<ILearningProgress>(
  {
    ...BaseEntityFields,
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    learningObjectId: { type: Schema.Types.ObjectId, required: true },
    loType: { type: String, enum: ['vocabulary', 'grammar', 'sentence', 'lesson'], required: true },
    learningObjectVersion: { type: Number, default: 1 },
    learningStrategy: { type: String, enum: ['fsrs', 'sm2', 'manual', 'ai'], default: 'sm2' },
    strategyState: { type: Schema.Types.Mixed, default: {} },
    masteryLevel: { type: Number, min: 0, max: 100, default: 0 },
    reviewCount: { type: Number, default: 0 },
    firstReviewedAt: { type: Date, default: null },
    lastReviewedAt: { type: Date, default: null },
    nextReviewAt: { type: Date, default: null, index: true, sparse: true },
    completedAt: { type: Date, default: null },
    lastResult: { type: String, enum: ['correct', 'incorrect', 'partial'], default: null },
    userContext: {
      expression: { type: String, trim: true },
      normalizedExpression: { type: String, trim: true, lowercase: true },
      entryType: { type: String, enum: ['word', 'phrase', 'expression'], default: 'word' },
      sourceLanguageId: { type: String, default: null },
      targetLanguageId: { type: String, default: null },
      contextSentence: { type: String, default: null },
      customTranslation: { type: String, default: null },
      personalNote: { type: String, default: null },
      sourceType: { type: String, enum: ['quiz', 'flashcard', 'lesson', 'manual'], default: 'manual' },
      sourceId: { type: String, default: null },
      encounters: [
        {
          expression: { type: String, trim: true },
          contextSentence: { type: String, default: null },
          sourceType: { type: String, default: 'quiz' },
          sourceId: { type: String, default: null },
          customTranslation: { type: String, default: null },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  BaseEntityOptions
)

LearningProgressSchema.index(
  { userId: 1, learningObjectId: 1, loType: 1, learningObjectVersion: 1 },
  { unique: true }
)
LearningProgressSchema.index({ userId: 1, status: 1, nextReviewAt: 1 })
LearningProgressSchema.index({ userId: 1, masteryLevel: 1 })

export const LearningProgress =
  mongoose.models.LearningProgress ??
  mongoose.model<ILearningProgress>('LearningProgress', LearningProgressSchema)
