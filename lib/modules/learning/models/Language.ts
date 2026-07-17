import mongoose, { Schema } from 'mongoose'
import type { ILanguage } from '@/lib/modules/learning/types/learning'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const LanguageSchema = new Schema<ILanguage>(
  {
    ...BaseEntityFields,
    code: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 10 },
    name: { type: String, required: true },
    nativeName: { type: String, required: true },
    direction: { type: String, enum: ['ltr', 'rtl'], default: 'ltr' },
    locale: { type: String, default: null, trim: true },  // 'en-US', 'vi-VN', 'ja-JP'
  },
  BaseEntityOptions
)

export const Language =
  mongoose.models.Language ??
  mongoose.model<ILanguage>('Language', LanguageSchema)
