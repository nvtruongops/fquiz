import { Types } from 'mongoose'

// ============================================================
// BaseEntity — Áp dụng cho TẤT CẢ model mới từ Phase 2.1
// ============================================================

export type EntityStatus =
  | 'draft'        // Đang soạn thảo
  | 'pending'      // Chờ review (AI-generated)
  | 'published'    // Active
  | 'archived'     // Đã archive
  | 'deleted'      // Soft deleted

export interface IBaseMetadata {
  searchKeywords?: string[]
  normalizedText?: string
  embeddingStatus?: 'none' | 'pending' | 'completed'
  source?: 'manual' | 'ai_generated' | 'imported'
  sourceRef?: string
  tags?: string[]
  customFields?: Record<string, unknown>
}

export interface IBaseEntity {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  createdBy?: Types.ObjectId | null
  updatedBy?: Types.ObjectId | null
  deletedAt?: Date | null
  deletedBy?: Types.ObjectId | null
  status: EntityStatus
  schemaVersion: number
  contentVersion: number
  metadata: IBaseMetadata
}
