import type { Types } from 'mongoose'
import type { IBaseEntity } from '@/lib/core/types/base-entity'

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
