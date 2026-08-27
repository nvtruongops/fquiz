import { Schema } from 'mongoose'

/**
 * BaseEntityFields — Mongoose schema fragment dùng chung cho mọi model mới.
 * Sử dụng: `new Schema({ ...BaseEntityFields, ...yourFields }, BaseEntityOptions)`
 *
 * CHUẨN HÓA:
 * - createdAt, updatedAt (qua timestamps)
 * - createdBy, updatedBy (ObjectId → User)
 * - deletedAt, deletedBy (soft delete)
 * - status (draft → published → archived → deleted)
 * - schemaVersion, contentVersion (migration + edit tracking)
 * - metadata (extensible)
 */

export const BaseEntityFields = {
  createdBy: { type: Schema.Types.ObjectId, default: null },
  updatedBy: { type: Schema.Types.ObjectId, default: null },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: Schema.Types.ObjectId, default: null },
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'archived', 'deleted'] as const,
    default: 'draft' as const,
    index: true,
  },
  schemaVersion: { type: Number, default: 1 },
  contentVersion: { type: Number, default: 1 },
  metadata: { type: Schema.Types.Mixed, default: {} },
}

export const BaseEntityOptions = {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
}
