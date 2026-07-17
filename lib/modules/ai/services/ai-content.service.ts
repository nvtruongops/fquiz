import { createHash } from 'crypto'
import { Types } from 'mongoose'
import type { IAIProvider } from '@/lib/core/ai/ai-provider-interface'
import type { ICache } from '@/lib/core/cache/cache-interface'
import { z } from 'zod'
import { AIAsset } from '@/lib/modules/ai/models/AIAsset'
import { promptRegistry } from '@/lib/modules/ai/prompts/registry'
import type { PromptType } from '@/lib/modules/ai/prompts/registry'
import type { AIGenerationType } from '@/lib/modules/ai/types/ai-types'
import { eventBus } from '@/lib/modules/learning/events/learning-events'

export interface AIContentRequest {
  type: AIGenerationType
  params: Record<string, unknown>
  sourceType?: string
  sourceId?: string
}

export interface AIContentResult<T = unknown> {
  content: T
  reused: boolean
  assetId: string
  durationMs: number
  cost: number
  tokensUsed: { input: number; output: number }
}

export class AIContentService {
  constructor(
    private aiProvider: IAIProvider,
    private cache: ICache
  ) {}

  async generate<T>(request: AIContentRequest): Promise<AIContentResult<T>> {
    const promptDef = promptRegistry[request.type as PromptType]
    if (!promptDef) {
      throw new Error(`Unknown generation type: ${request.type}`)
    }

    const requestHash = this.computeHash(request)
    const cacheKey = `ai:${requestHash}`

    const cached = await this.cache.get<AIContentResult<T>>(cacheKey)
    if (cached) return cached

    const existing = await AIAsset.findOne({ requestHash, aiProvider: 'gemini' }).lean()
    if (existing && existing.status === 'completed') {
      const result: AIContentResult<T> = {
        content: JSON.parse(existing.responseHash) as T,
        reused: true,
        assetId: existing._id.toString(),
        durationMs: 0,
        cost: 0,
        tokensUsed: { input: 0, output: 0 },
      }
      await this.cache.set(cacheKey, result, 3600)
      return result
    }

    const prompt = promptDef.buildPrompt(request.params as never)
    const schema = promptDef.schema as unknown as z.ZodType<T>

    const asset = await AIAsset.create({
      sourceType: request.sourceType ?? request.type,
      sourceId: new Types.ObjectId(request.sourceId ?? '000000000000000000000000'),
      requestHash,
      responseHash: '',
      prompt,
      promptVersion: promptDef.version,
      aiProvider: 'gemini',
      aiModel: 'gemini-2.0-flash-001',
      status: 'processing',
    })

    try {
      const genResult = await this.aiProvider.generate<T>(prompt, { responseSchema: schema })

      await AIAsset.findByIdAndUpdate(asset._id, {
        status: 'completed',
        responseHash: JSON.stringify(genResult.content),
        aiModel: genResult.model,
        requestTokens: genResult.tokensUsed.input,
        responseTokens: genResult.tokensUsed.output,
        cost: genResult.cost,
        durationMs: genResult.durationMs,
        providerRequestId: `req-${Date.now()}`,
      })

      const result: AIContentResult<T> = {
        content: genResult.content,
        reused: false,
        assetId: asset._id.toString(),
        durationMs: genResult.durationMs,
        cost: genResult.cost,
        tokensUsed: genResult.tokensUsed,
      }

      await this.cache.set(cacheKey, result, 3600)

      eventBus.emit({
        eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        eventType: 'AIAssetGenerated',
        occurredAt: new Date(),
        version: 1,
        aggregateId: asset._id as Types.ObjectId,
        aggregateType: 'AIAsset',
        payload: {
          assetId: asset._id.toString(),
          sourceType: request.type,
          sourceId: request.sourceId ?? '',
          provider: 'gemini',
          model: genResult.model,
        },
      })

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await AIAsset.findByIdAndUpdate(asset._id, {
        status: 'failed',
        errorMessage: message,
        retryCount: 1,
      })
      throw error
    }
  }

  private computeHash(request: AIContentRequest): string {
    const normalized = {
      type: request.type,
      params: this.sortObject(request.params),
    }
    return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
  }

  private sortObject(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, key) => {
      const val = obj[key]
      acc[key] = val !== null && typeof val === 'object' && !Array.isArray(val)
        ? this.sortObject(val as Record<string, unknown>)
        : val
      return acc
    }, {})
  }
}




