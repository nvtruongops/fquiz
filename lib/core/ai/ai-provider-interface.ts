import type { ZodSchema } from 'zod'

/**
 * IAIProvider — Multi-provider AI abstraction.
 *
 * Implementations:
 * - GeminiProvider (Phase 3)
 * - OpenAIProvider (future)
 * - ClaudeProvider (future)
 * - DeepSeekProvider (future)
 */

export interface AIGenerationOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseSchema?: ZodSchema<unknown>
}

export interface AIGenerationResult<T = unknown> {
  content: T
  model: string
  tokensUsed: { input: number; output: number }
  cost: number
  durationMs: number
}

export interface AIEmbeddingResult {
  embedding: number[]
  model: string
  tokensUsed: number
}

export interface AIModerationResult {
  flagged: boolean
  categories: Record<string, boolean>
  scores: Record<string, number>
}

export interface IAIProvider {
  /** Generate structured content with Zod validation */
  generate<T>(prompt: string, options?: AIGenerationOptions): Promise<AIGenerationResult<T>>

  /** Generate text embedding vector */
  embed(text: string): Promise<AIEmbeddingResult>

  /** Moderate content for safety */
  moderate(text: string): Promise<AIModerationResult>
}
