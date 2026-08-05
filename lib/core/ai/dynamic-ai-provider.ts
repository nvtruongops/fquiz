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
      return settings.llm_config?.active_provider ?? 'gemini'
    } catch {
      return 'gemini'
    }
  }

  private async getActiveProvider(): Promise<IAIProvider> {
    try {
      const settings = await getSettings()
      const llmConfig = settings.llm_config
      const activeProvider = llmConfig?.active_provider ?? 'gemini'

      if (activeProvider === 'openai') {
        const rawKey = llmConfig?.openai?.apiKey || process.env.OPENAI_API_KEY
        const apiKey = decryptSecret(rawKey || '')
        const baseUrl = (llmConfig?.openai as { baseUrl?: string })?.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
        const model = llmConfig?.openai?.model || process.env.OPENAI_MODEL || 'AI'
        return new OpenAIProvider(apiKey, baseUrl, model)
      }

      if (activeProvider === 'custom') {
        const rawKey = llmConfig?.custom?.apiKey || process.env.OPENAI_API_KEY
        const apiKey = decryptSecret(rawKey || '')
        const baseUrl = llmConfig?.custom?.baseUrl || process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1'
        const model = llmConfig?.custom?.model || process.env.OPENAI_MODEL || 'AI'
        return new OpenAIProvider(apiKey, baseUrl, model)
      }

      // Default: gemini
      const rawKey = llmConfig?.gemini?.apiKey || process.env.GEMINI_API_KEY
      const apiKey = decryptSecret(rawKey || '')
      const model = llmConfig?.gemini?.model || 'gemini-2.0-flash-001'
      return new GeminiProvider(apiKey, model)
    } catch {
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
