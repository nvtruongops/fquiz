import mongoose, { Schema } from 'mongoose'
import type { ICategory } from '../entities/quiz.types'

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    is_public: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    type: { type: String, enum: ['private', 'public'], default: 'public' },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

CategorySchema.index({ name: 1, owner_id: 1 }, { unique: true })
CategorySchema.index({ type: 1, status: 1, created_at: -1 })
CategorySchema.index({ owner_id: 1, type: 1, created_at: -1 })

export const PUBLIC_CATEGORY_MATCH = {
  $or: [
    { type: 'public' },
    { is_public: true },
    { type: { $exists: false }, owner_id: null },
  ],
  status: { $nin: ['pending', 'rejected'] },
}

export const Category =
  mongoose.models.Category ?? mongoose.model<ICategory>('Category', CategorySchema)
