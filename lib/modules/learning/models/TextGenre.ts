import mongoose, { Schema } from 'mongoose'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

export interface ITextGenre {
  name: string
  code: string
  description?: string
  icon?: string
  defaultTone?: string
  status: 'published' | 'draft'
}

const TextGenreSchema = new Schema<ITextGenre>(
  {
    ...BaseEntityFields,
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '📄' },
    defaultTone: { type: String, default: 'formal' },
    status: { type: String, default: 'published', index: true },
  },
  BaseEntityOptions
)

export const TextGenre =
  mongoose.models.TextGenre ??
  mongoose.model<ITextGenre>('TextGenre', TextGenreSchema)
