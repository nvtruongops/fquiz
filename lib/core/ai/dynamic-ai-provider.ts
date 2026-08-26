import { getSettings } from '@/lib/modules/auth/models/SiteSettings'
import { GeminiProvider } from '@/lib/core/ai/gemini-provider'
import { OpenAIProvider } from '@/lib/core/ai/openai-provider'
import { decryptSecret } from '@/lib/core/security/crypto'
import type {
  IAIProvider,
  AIGenerationOptions,
  AIGenerationResult,
  AIEmbeddingResult,
  AIModerationResult,
} from '@/lib/core/ai/ai-provider-interface'

export class DynamicAIProvider implements IAIProvider {
  async getProviderName(): Promise<string> {
    try {
      const settings = await getSettings()
      return settings.llm_config?.active_provider ?? process.env.AI_PROVIDER ?? (process.env.OPENAI_BASE_URL ? 'openai' : 'gemini')
    } catch {
      return process.env.AI_PROVIDER ?? (process.env.OPENAI_BASE_URL ? 'openai' : 'gemini')
    }
  }

  private async getActiveProvider(): Promise<IAIProvider> {
    try {
      const settings = await getSettings()
      const llmConfig = settings.llm_config
      const activeProvider = llmConfig?.active_provider || process.env.AI_PROVIDER || (process.env.OPENAI_BASE_URL ? 'openai' : 'gemini')

      if (activeProvider === 'openai') {
        const rawKey = llmConfig?.openai?.apiKey || process.env.OPENAI_API_KEY
        const apiKey = decryptSecret(rawKey || '') || rawKey
        const baseUrl = (llmConfig?.openai as { baseUrl?: string })?.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
        const model = llmConfig?.openai?.model || process.env.OPENAI_MODEL || 'antigravity/gemini-2.5-flash'
        return new OpenAIProvider(apiKey, baseUrl, model)
      }

      if (activeProvider === 'custom') {
        const rawKey = llmConfig?.custom?.apiKey || process.env.OPENAI_API_KEY
        const apiKey = decryptSecret(rawKey || '') || rawKey
        const baseUrl = llmConfig?.custom?.baseUrl || process.env.OPENAI_BASE_URL || 'http://localhost:20128/v1'
        const model = llmConfig?.custom?.model || process.env.OPENAI_MODEL || 'antigravity/gemini-2.5-flash'
        return new OpenAIProvider(apiKey, baseUrl, model)
      }

      // Default: gemini
      const rawKey = llmConfig?.gemini?.apiKey || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY
      const apiKey = decryptSecret(rawKey || '') || rawKey
      const model = llmConfig?.gemini?.model || 'gemini-1.5-flash'
      return new GeminiProvider(apiKey, model)
    } catch {
      if (process.env.OPENAI_BASE_URL || process.env.OPENAI_API_KEY) {
        return new OpenAIProvider(
          process.env.OPENAI_API_KEY,
          process.env.OPENAI_BASE_URL || 'http://localhost:20128/v1',
          process.env.OPENAI_MODEL || 'antigravity/gemini-2.5-flash'
        )
      }
      return new GeminiProvider()
    }
  }

  async generate<T>(prompt: string, options?: AIGenerationOptions): Promise<AIGenerationResult<T>> {
    const provider = await this.getActiveProvider()
    return provider.generate<T>(prompt, options)
  }

  async embed(text: string): Promise<AIEmbeddingResult> {
    const provider = await this.getActiveProvider()
    return provider.embed(text)
  }

  async moderate(text: string): Promise<AIModerationResult> {
    const provider = await this.getActiveProvider()
    return provider.moderate(text)
  }
}
