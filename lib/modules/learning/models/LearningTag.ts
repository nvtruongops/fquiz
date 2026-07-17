import mongoose, { Schema } from 'mongoose'
import type { IBaseEntity } from '@/lib/core/types/base-entity'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

export interface ILearningTag extends IBaseEntity {
  name: string                    // 'Business', 'IELTS', 'TOEIC', 'Beginner'
  slug: string                    // 'business', 'ielts'
  group?: string                  // 'exam' | 'level' | 'topic' | 'skill'
  color?: string                  // Hex color for UI
  icon?: string
  isSystem: boolean               // true = hệ thống, false = user-created
}

const LearningTagSchema = new Schema<ILearningTag>(
  {
    ...BaseEntityFields,
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    group: { type: String, default: null },
    color: { type: String, default: null },
    icon: { type: String, default: null },
    isSystem: { type: Boolean, default: false },
  },
  BaseEntityOptions
)

LearningTagSchema.index({ group: 1, slug: 1 })
LearningTagSchema.index({ name: 'text' })

export const LearningTag =
  mongoose.models.LearningTag ??
  mongoose.model<ILearningTag>('LearningTag', LearningTagSchema)
