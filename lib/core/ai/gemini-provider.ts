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

const DEFAULT_MODEL = 'gemini-2.0-flash-001'
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
  private client: GoogleGenerativeAI
  private apiKey: string
  private defaultModel: string

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || ''
    this.defaultModel = defaultModel || DEFAULT_MODEL
    if (!this.apiKey) {
      console.warn('[GeminiProvider] GEMINI_API_KEY not set — provider will fail at runtime')
    }
    this.client = new GoogleGenerativeAI(this.apiKey)
  }

  async getProviderName(): Promise<string> {
    return 'gemini'
  }

  async generate<T>(
    prompt: string,
    options?: AIGenerationOptions
  ): Promise<AIGenerationResult<T>> {
    const startTime = Date.now()
    const modelName = options?.model ?? this.defaultModel
    const genModel = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
        responseMimeType: options?.responseSchema ? 'application/json' : undefined,
      },
    })

    if (!this.apiKey) {
      throw new Error('Chưa cấu hình API Key cho Gemini (trong Admin Settings hoặc GEMINI_API_KEY)')
    }

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
  }

  async embed(text: string): Promise<AIEmbeddingResult> {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`,
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
    const embedding: number[] = data.embedding?.values ?? []

    return {
      embedding,
      model: EMBEDDING_MODEL,
      tokensUsed: data.usageMetadata?.promptTokenCount ?? 0,
    }
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

