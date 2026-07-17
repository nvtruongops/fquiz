import mongoose, { Schema } from 'mongoose'
import type { ITopic } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const TopicSchema = new Schema<ITopic>(
  {
    ...BaseEntityFields,
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon: { type: String, default: null },
    parentTopicId: { type: Schema.Types.ObjectId, default: null, index: true },
    path: { type: String, required: true, index: true },  // materialized path
  },
  BaseEntityOptions
)

TopicSchema.index({ name: 'text' })

export const Topic =
  mongoose.models.Topic ??
  mongoose.model<ITopic>('Topic', TopicSchema)
