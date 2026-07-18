import type { ZodSchema } from 'zod'
import type {
  IAIProvider,
  AIGenerationOptions,
  AIGenerationResult,
  AIEmbeddingResult,
  AIModerationResult,
} from '@/lib/core/ai/ai-provider-interface'

export function extractJsonString(str: string): string {
  if (!str) return ''
  const trimmed = str.trim()

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch && codeBlockMatch[1]) {
    const content = codeBlockMatch[1].trim()
    if (content) return content
  }

  const firstBracket = trimmed.indexOf('[')
  const lastBracket = trimmed.lastIndexOf(']')
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  const hasArray = firstBracket !== -1 && lastBracket > firstBracket
  const hasObj = firstBrace !== -1 && lastBrace > firstBrace

  if (hasArray && (!hasObj || firstBracket < firstBrace)) {
    return trimmed.slice(firstBracket, lastBracket + 1).trim()
  }

  if (hasObj) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim()
  }

  return trimmed
}

export class OpenAIProvider implements IAIProvider {
  private apiKey: string
  private baseUrl: string
  private defaultModel: string

  constructor(apiKey?: string, baseUrl?: string, defaultModel?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
    this.baseUrl = baseUrl || 'https://api.openai.com/v1'
    this.defaultModel = defaultModel || 'gpt-4o-mini'
  }

  async getProviderName(): Promise<string> {
    return this.baseUrl.includes('openai.com') ? 'openai' : 'custom'
  }

  async generate<T>(
    prompt: string,
    options?: AIGenerationOptions
  ): Promise<AIGenerationResult<T>> {
    const startTime = Date.now()
    const modelName = options?.model ?? this.defaultModel
    const cleanUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    const endpoint = cleanUrl.endsWith('/v1') ? `${cleanUrl}/chat/completions` : `${cleanUrl}/v1/chat/completions`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const messages: Array<{ role: string; content: string }> = []
    if (options?.responseSchema) {
      messages.push({
        role: 'system',
        content:
          'You are a strict JSON generator. Output ONLY valid JSON matching the requested structure. Never output introductory remarks, conversational text, explanations, or chat preamble.',
      })
    }
    messages.push({ role: 'user', content: prompt })

    const payload: Record<string, unknown> = {
      model: modelName,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: false,
    }

    if (options?.responseSchema) {
      payload.response_format = { type: 'json_object' }
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const rawResponseBody = await res.text()

    if (!res.ok) {
      let errorMsg = `LLM API Error HTTP ${res.status}`
      try {
        const errData = JSON.parse(rawResponseBody)
        errorMsg =
          errData.error?.message ||
          (typeof errData.error === 'string' ? errData.error : null) ||
          errorMsg
      } catch {
        if (rawResponseBody) errorMsg = rawResponseBody
      }
      throw new Error(errorMsg)
    }

    let textContent = ''
    let inputTokens = 0
    let outputTokens = 0

    const trimmedBody = rawResponseBody.trim()
    if (trimmedBody.startsWith('data:')) {
      const lines = trimmedBody.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
          try {
            const chunkJson = JSON.parse(trimmed.slice(5).trim())
            const delta = chunkJson.choices?.[0]?.delta?.content || chunkJson.choices?.[0]?.text || ''
            textContent += delta
            if (chunkJson.usage) {
              inputTokens = chunkJson.usage.prompt_tokens ?? inputTokens
              outputTokens = chunkJson.usage.completion_tokens ?? outputTokens
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } else {
      const data = JSON.parse(trimmedBody)
      textContent = data.choices?.[0]?.message?.content ?? ''
      inputTokens = data.usage?.prompt_tokens ?? 0
      outputTokens = data.usage?.completion_tokens ?? 0
    }

    const cleanContent = extractJsonString(textContent)

    let content: T
    if (options?.responseSchema) {
      const schema = options.responseSchema as ZodSchema<T>
      content = schema.parse(JSON.parse(cleanContent))
    } else {
      content = cleanContent as unknown as T
    }

    return {
      content,
      model: modelName,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
      },
      cost: this.estimateCost(inputTokens, outputTokens, modelName),
      durationMs: Date.now() - startTime,
    }
  }

  async embed(text: string): Promise<AIEmbeddingResult> {
    const cleanUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    const endpoint = cleanUrl.endsWith('/v1') ? `${cleanUrl}/embeddings` : `${cleanUrl}/v1/embeddings`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    })

    if (!res.ok) {
      throw new Error(`OpenAI Embedding Error HTTP ${res.status}`)
    }

    const data = await res.json()
    const embedding = data.data?.[0]?.embedding ?? []
    const tokensUsed = data.usage?.total_tokens ?? 0

    return {
      embedding,
      model: 'text-embedding-3-small',
      tokensUsed,
    }
  }

  async moderate(_text: string): Promise<AIModerationResult> {
    return { flagged: false, categories: {}, scores: {} }
  }

  private estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    const rates: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
      'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
      'gpt-3.5-turbo': { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000 },
    }
    const rate = rates[model] ?? rates['gpt-4o-mini']!
    return inputTokens * rate.input + outputTokens * rate.output
  }
}
