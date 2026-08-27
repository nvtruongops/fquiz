import mongoose, { Schema, Document } from 'mongoose'

export interface ILLMProviderConfig {
  apiKey?: string
  model?: string
  baseUrl?: string
}

export interface ISiteSettings extends Document {
  _id: mongoose.Types.ObjectId
  app_name: string
  app_description: string
  allow_registration: boolean
  maintenance_mode: boolean
  anti_sharing_enabled: boolean
  anti_sharing_max_violations: number
  llm_config?: {
    active_provider: 'openai' | 'gemini' | 'custom'
    openai?: ILLMProviderConfig
    gemini?: ILLMProviderConfig
    custom?: ILLMProviderConfig
  }
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    app_name: { type: String, required: true, default: 'FQuiz Platform' },
    app_description: { type: String, required: true, default: 'Nền tảng ôn tập thông minh trực tuyến' },
    allow_registration: { type: Boolean, required: true, default: true },
    maintenance_mode: { type: Boolean, required: true, default: false },
    anti_sharing_enabled: { type: Boolean, required: true, default: false },
    anti_sharing_max_violations: { type: Number, required: true, default: 10 },
    llm_config: {
      active_provider: { type: String, enum: ['openai', 'gemini', 'custom'], default: 'gemini' },
      openai: {
        apiKey: { type: String, default: '' },
        model: { type: String, default: 'gpt-4o-mini' },
      },
      gemini: {
        apiKey: { type: String, default: '' },
        model: { type: String, default: 'gemini-2.0-flash-001' },
      },
      custom: {
        baseUrl: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        model: { type: String, default: '' },
      },
    },
  },
  { timestamps: false }
)

export const SiteSettings =
  (mongoose.models.SiteSettings as mongoose.Model<ISiteSettings>) ??
  mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema)

let cachedSettings: any = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 1000

const DEFAULT_LLM_CONFIG = {
  active_provider: 'gemini' as const,
  openai: { apiKey: '', model: 'gpt-4o-mini' },
  gemini: { apiKey: '', model: 'gemini-2.0-flash-001' },
  custom: { baseUrl: '', apiKey: '', model: '' },
}

export async function getSettings(): Promise<any> {
  const now = Date.now()
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    if (!cachedSettings.llm_config) {
      cachedSettings.llm_config = DEFAULT_LLM_CONFIG
    }
    return cachedSettings
  }

  let settings = await SiteSettings.findOne().lean()
  if (!settings) {
    settings = await SiteSettings.create({})
  }

  if (!settings.llm_config) {
    await SiteSettings.findByIdAndUpdate(settings._id, {
      $set: { llm_config: DEFAULT_LLM_CONFIG },
    })
    settings.llm_config = DEFAULT_LLM_CONFIG
  }

  cachedSettings = settings
  cacheTimestamp = now
  return cachedSettings
}

export function clearSettingsCache(): void {
  cachedSettings = null
  cacheTimestamp = 0
}
