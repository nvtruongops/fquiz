import mongoose, { Schema, Document } from 'mongoose'

export interface IAILearningLog extends Document {
  userId: mongoose.Types.ObjectId
  type: string
  language: string
  topic?: string
  cefrLevel?: string
  prompt: string
  response: string
  aiProvider: string
  aiModel?: string
  tokensUsed?: number
  durationMs?: number
  metadata?: Record<string, unknown>
  createdAt: Date
}

const AILearningLogSchema = new Schema<IAILearningLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  language: { type: String, required: true },
  topic: { type: String },
  cefrLevel: { type: String },
  prompt: { type: String },
  response: { type: String },
  aiProvider: { type: String, required: true },
  aiModel: { type: String },
  tokensUsed: { type: Number },
  durationMs: { type: Number },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
})

AILearningLogSchema.index({ userId: 1, createdAt: -1 })

export const AILearningLog = mongoose.models.AILearningLog || mongoose.model<IAILearningLog>('AILearningLog', AILearningLogSchema)
