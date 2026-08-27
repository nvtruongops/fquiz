import mongoose, { Schema } from 'mongoose'
import type { IAILearningLog } from '../entities/ai.types'

const AILearningLogSchema = new Schema<IAILearningLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, index: true },
  language: { type: String, required: true },
  topic: { type: String },
  cefrLevel: { type: String },
  prompt: { type: String },
  response: { type: String },
  aiProvider: { type: String, required: true },
  aiModel: { type: String },
  tokensUsed: { type: Number },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  durationMs: { type: Number },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
})

AILearningLogSchema.index({ userId: 1, createdAt: -1 })
AILearningLogSchema.index({ type: 1, createdAt: -1 })

export const AILearningLog =
  mongoose.models.AILearningLog ??
  mongoose.model<IAILearningLog>('AILearningLog', AILearningLogSchema)
