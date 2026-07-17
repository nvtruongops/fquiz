import mongoose, { Schema } from 'mongoose'
import type { IModule } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const ModuleSchema = new Schema<IModule>(
  {
    ...BaseEntityFields,
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 0 },
    courseId: { type: Schema.Types.ObjectId, required: true, index: true },
    unlockAfterModuleId: { type: Schema.Types.ObjectId, default: null },
  },
  BaseEntityOptions
)

ModuleSchema.index({ courseId: 1, order: 1 }, { unique: true })

export const Module =
  mongoose.models.Module ??
  mongoose.model<IModule>('Module', ModuleSchema)
