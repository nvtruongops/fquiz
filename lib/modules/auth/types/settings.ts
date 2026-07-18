import { Types } from 'mongoose'

export interface ILLMConfig {
  active_provider: 'openai' | 'gemini' | 'custom'
  openai: {
    apiKey: string
    model: string
  }
  gemini: {
    apiKey: string
    model: string
  }
  custom: {
    baseUrl: string
    apiKey: string
    model: string
  }
}

export interface ISiteSettings {
  _id: Types.ObjectId
  app_name: string
  app_description: string
  allow_registration: boolean
  maintenance_mode: boolean
  anti_sharing_enabled: boolean
  anti_sharing_max_violations: number
  llm_config?: ILLMConfig
}

