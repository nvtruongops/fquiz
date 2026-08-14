import { GoogleGenerativeAI } from '@google/generative-ai'
import { extractJsonString } from './openai-provider'
import type { ZodSchema } from 'zod'
import type {
  IAIProvider,
  AIGenerationOptions,
  AIGenerationResult,
  AIEmbeddingResult,
  AIModerationResult,
} from '@/lib/core/ai/ai-provider-interface'

const DEFAULT_MODEL = 'gemini-1.5-flash'
const EMBEDDING_MODEL = 'text-embedding-004'

export function parseGeminiTokenUsage(usage: any, textLength?: number): { input: number; output: number } {
  if (!usage) {
    const estimatedOutput = textLength ? Math.max(1, Math.ceil(textLength / 4)) : 0
    return { input: 0, output: estimatedOutput }
  }
  const input = Number(
    usage.promptTokenCount ?? usage.prompt_token_count ?? usage.promptTokens ?? usage.inputTokens ?? 0
  ) || 0

  let output = Number(
    usage.candidatesTokenCount ??
    usage.candidates_token_count ??
    usage.outputTokenCount ??
    usage.output_token_count ??
    usage.completionTokens ??
    usage.outputTokens
  ) || 0

  if (output <= 0) {
    const total = usage.totalTokenCount ?? usage.total_token_count ?? usage.totalTokens
    if (typeof total === 'number' && total > input) {
      output = total - input
    } else if (textLength && textLength > 0) {
      output = Math.max(1, Math.ceil(textLength / 4))
    }
  }

  return { input, output }
}

export class GeminiProvider implements IAIProvider {
  private apiKeys: string[]
  private static globalKeyIndex = 0
  private defaultModel: string

  constructor(apiKey?: string, defaultModel?: string) {
    const rawKeys = apiKey || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || ''
    this.apiKeys = rawKeys
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    this.defaultModel = defaultModel || DEFAULT_MODEL
    if (this.apiKeys.length === 0) {
      console.warn('[GeminiProvider] GEMINI_API_KEY not set — provider will fail at runtime')
    }
  }

  async getProviderName(): Promise<string> {
    return 'gemini'
  }

  private getNextClient(): { client: GoogleGenerativeAI; key: string; index: number } {
    if (this.apiKeys.length === 0) {
      throw new Error('Chưa cấu hình API Key cho Gemini (trong Admin Settings hoặc GEMINI_API_KEY)')
    }
    const index = (GeminiProvider.globalKeyIndex++) % this.apiKeys.length
    const key = this.apiKeys[index]
    return { client: new GoogleGenerativeAI(key), key, index }
  }

  async generate<T>(
    prompt: string,
    options?: AIGenerationOptions
  ): Promise<AIGenerationResult<T>> {
    if (this.apiKeys.length === 0) {
      throw new Error('Chưa cấu hình API Key cho Gemini (trong Admin Settings hoặc GEMINI_API_KEY)')
    }

    const startTime = Date.now()
    const modelName = options?.model ?? this.defaultModel
    const maxAttempts = Math.max(1, this.apiKeys.length)
    let lastError: unknown

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { client, index } = this.getNextClient()
      try {
        const genModel = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: options?.temperature,
            maxOutputTokens: options?.maxTokens,
            responseMimeType: options?.responseSchema ? 'application/json' : undefined,
          },
        })

        const result = await genModel.generateContent(prompt)
        const response = result.response
        const rawText = response.text()
        const cleanText = extractJsonString(rawText)
        const usage = response.usageMetadata
        const tokensUsed = parseGeminiTokenUsage(usage, cleanText.length)

        let content: T

        if (options?.responseSchema) {
          const schema = options.responseSchema as ZodSchema<T>
          content = schema.parse(JSON.parse(cleanText))
        } else {
          content = cleanText as unknown as T
        }

        return {
          content,
          model: modelName,
          tokensUsed,
          cost: this.estimateCost(tokensUsed.input, tokensUsed.output, modelName),
          durationMs: Date.now() - startTime,
        }
      } catch (err) {
        lastError = err
        const errStr = err instanceof Error ? err.message : String(err)
        console.warn(`[GeminiProvider] Key index ${index} failed (attempt ${attempt + 1}/${maxAttempts}): ${errStr}. Rotating to next key...`)

        // If the model is 404 / unavailable for this key tier, attempt fallback to gemini-1.5-flash
        if (errStr.includes('404') || errStr.includes('no longer available')) {
          try {
            const fallbackModelName = 'gemini-1.5-flash'
            const fallbackModel = client.getGenerativeModel({
              model: fallbackModelName,
              generationConfig: {
                temperature: options?.temperature,
                maxOutputTokens: options?.maxTokens,
                responseMimeType: options?.responseSchema ? 'application/json' : undefined,
              },
            })

            const result = await fallbackModel.generateContent(prompt)
            const response = result.response
            const rawText = response.text()
            const cleanText = extractJsonString(rawText)
            const usage = response.usageMetadata
            const tokensUsed = parseGeminiTokenUsage(usage, cleanText.length)

            let content: T

            if (options?.responseSchema) {
              const schema = options.responseSchema as ZodSchema<T>
              content = schema.parse(JSON.parse(cleanText))
            } else {
              content = cleanText as unknown as T
            }

            return {
              content,
              model: fallbackModelName,
              tokensUsed,
              cost: this.estimateCost(tokensUsed.input, tokensUsed.output, fallbackModelName),
              durationMs: Date.now() - startTime,
            }
          } catch (fallbackErr) {
            console.warn(`[GeminiProvider] Key index ${index} fallback model gemini-1.5-flash also failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`)
          }
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  async embed(text: string): Promise<AIEmbeddingResult> {
    if (this.apiKeys.length === 0) {
      throw new Error('Chưa cấu hình API Key cho Gemini (trong Admin Settings hoặc GEMINI_API_KEY)')
    }

    const maxAttempts = Math.max(1, this.apiKeys.length)
    let lastError: unknown

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { key, index } = this.getNextClient()
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: `models/${EMBEDDING_MODEL}`,
              content: { parts: [{ text }] },
            }),
          }
        )

        const data = await resp.json()
        if (!resp.ok) {
          throw new Error(data.error?.message || `HTTP ${resp.status}`)
        }

        const embedding: number[] = data.embedding?.values ?? []

        return {
          embedding,
          model: EMBEDDING_MODEL,
          tokensUsed: data.usageMetadata?.promptTokenCount ?? 0,
        }
      } catch (err) {
        lastError = err
        console.warn(`[GeminiProvider.embed] Key index ${index} failed (attempt ${attempt + 1}/${maxAttempts}): ${err instanceof Error ? err.message : String(err)}. Rotating to next key...`)
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  async moderate(_text: string): Promise<AIModerationResult> {
    return { flagged: false, categories: {}, scores: {} }
  }

  private estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    const rates: Record<string, { input: number; output: number }> = {
      'gemini-2.0-flash-001': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
      'gemini-2.0-flash-lite-001': { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
      'gemini-1.5-pro': { input: 1.25 / 1_000_000, output: 5.00 / 1_000_000 },
      'gemini-1.5-flash': { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
    }

    const rate = rates[model] ?? rates['gemini-2.0-flash-001']!
    return (inputTokens * rate.input) + (outputTokens * rate.output)
  }
}

