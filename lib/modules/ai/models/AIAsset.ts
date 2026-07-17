import mongoose, { Schema } from 'mongoose'
import type { IAIAsset } from '@/lib/modules/ai/types/ai-types'
import { BaseEntityFields, BaseEntityOptions } from '@/lib/core/db/base-schema'

const AIAssetSchema = new Schema<IAIAsset>(
  {
    ...BaseEntityFields,
    sourceType: { type: String, required: true },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    requestHash: { type: String, required: true },
    responseHash: { type: String, required: true },
    prompt: { type: String, required: true },
    promptVersion: { type: String, required: true },
    aiProvider: { type: String, required: true },
    aiModel: { type: String, required: true },
    providerRequestId: { type: String, default: null },
    providerResponseId: { type: String, default: null },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'], default: 'queued', index: true },
    errorMessage: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    requestTokens: { type: Number, default: null },
    responseTokens: { type: Number, default: null },
    cost: { type: Number, default: null },
    durationMs: { type: Number, default: null },
  },
  BaseEntityOptions
)

AIAssetSchema.index({ responseHash: 1, sourceType: 1 })
AIAssetSchema.index({ requestHash: 1, aiProvider: 1 }, { unique: true })
AIAssetSchema.index({ status: 1, createdAt: 1 })
AIAssetSchema.index({ aiProvider: 1, aiModel: 1, createdAt: -1 })

export const AIAsset =
  mongoose.models.AIAsset ??
  mongoose.model<IAIAsset>('AIAsset', AIAssetSchema)
