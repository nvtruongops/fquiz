import mongoose, { Schema } from 'mongoose'
import type { ILesson } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const LessonSchema = new Schema<ILesson>(
  {
    ...BaseEntityFields,
    title: { type: String, required: true, trim: true },
    objective: { type: String, default: '' },
    learningObjective: { type: String, default: '' },
    moduleId: { type: Schema.Types.ObjectId, required: true, index: true },
    order: { type: Number, required: true, min: 0 },
    prerequisites: [{ type: Schema.Types.ObjectId }],
    cefrLevel: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], default: null },
    estimatedMinutes: { type: Number, min: 1, max: 480, default: null },
  },
  BaseEntityOptions
)

LessonSchema.index({ moduleId: 1, order: 1 }, { unique: true })
LessonSchema.index({ prerequisites: 1 })

export const Lesson =
  mongoose.models.Lesson ??
  mongoose.model<ILesson>('Lesson', LessonSchema)
