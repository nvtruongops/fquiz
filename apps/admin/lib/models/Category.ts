import mongoose, { Schema, Document } from 'mongoose'

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  owner_id?: mongoose.Types.ObjectId | null
  is_public: boolean
  status: 'pending' | 'approved' | 'rejected'
  type: 'private' | 'public'
  created_at: Date
}

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
  (mongoose.models.Category as mongoose.Model<ICategory>) ??
  mongoose.model<ICategory>('Category', CategorySchema)
