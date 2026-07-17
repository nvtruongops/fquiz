import mongoose, { Schema } from 'mongoose'
import type { ICourse } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const CourseSchema = new Schema<ICourse>(
  {
    ...BaseEntityFields,
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    languageId: { type: Schema.Types.ObjectId, required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, required: true, index: true },
    cefrLevel: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], default: null },
    difficulty: { type: Number, min: 1, max: 10, default: null },
    frequency: { type: Number, default: null },
    tags: [{ type: Schema.Types.ObjectId }],
    source: { type: String, enum: ['manual','ai_generated','imported','seed','user_created'], default: 'manual' },
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, default: null },
    verifiedAt: { type: Date, default: null },
    prerequisites: [{ type: Schema.Types.ObjectId }],
    publishedVersion: { type: Number, default: 1 },
    draftVersion: { type: Number, default: 1 },
  },
  BaseEntityOptions
)

CourseSchema.index({ languageId: 1, cefrLevel: 1, status: 1 })
CourseSchema.index({ topicId: 1, status: 1 })
CourseSchema.index({ title: 'text' })

export const Course =
  mongoose.models.Course ??
  mongoose.model<ICourse>('Course', CourseSchema)
