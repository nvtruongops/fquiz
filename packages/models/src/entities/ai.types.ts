import type { Types } from 'mongoose'
import type { IBaseEntity } from './base-entity'

export type AIAssetStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface IAIAsset extends Omit<IBaseEntity, 'status'> {
  sourceType: string
  sourceId: Types.ObjectId
  requestHash: string
  responseHash: string
  prompt: string
  promptVersion: string
  aiProvider: string
  aiModel: string
  providerRequestId?: string
  providerResponseId?: string
  status: AIAssetStatus
  errorMessage?: string
  retryCount: number
  requestTokens?: number
  responseTokens?: number
  cost?: number
  durationMs?: number
}

export interface IAILearningLog {
  _id?: Types.ObjectId
  userId: Types.ObjectId
  type: string
  language: string
  topic?: string
  cefrLevel?: string
  prompt: string
  response: string
  aiProvider: string
  aiModel?: string
  tokensUsed?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  cost?: number
  durationMs?: number
  metadata?: Record<string, unknown>
  createdAt?: Date
}

export type AIGenerationType =
  | 'vocabulary'
  | 'sentence'
  | 'paragraph'
  | 'grammar'
  | 'quiz'
  | 'flashcard'
  | 'translation'
  | 'dialogue'
  | 'story'
  | 'example_sentences'
  | 'writing'
  | 'writing_eval'
  | 'quiz_assistant'
