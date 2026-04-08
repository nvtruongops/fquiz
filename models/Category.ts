import mongoose, { Schema } from 'mongoose'
import type { ICategory } from '@/types/quiz'

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    is_public: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }, // default approved for admin/private
    type: { type: String, enum: ['private', 'public'], default: 'public' },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

// Unique name per owner (null owner = admin/public categories)
CategorySchema.index({ name: 1, owner_id: 1 }, { unique: true })
// Fast path for admin category listing/filtering.
CategorySchema.index({ type: 1, status: 1, created_at: -1 })
// Fast path for user-owned category queries.
CategorySchema.index({ owner_id: 1, type: 1, created_at: -1 })

export const Category =
  mongoose.models.Category ?? mongoose.model<ICategory>('Category', CategorySchema)
