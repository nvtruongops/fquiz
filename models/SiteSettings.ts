import mongoose, { Schema } from 'mongoose'
import type { ISiteSettings } from '@/types/settings'

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    app_name: { type: String, required: true, default: 'FQuiz Platform' },
    app_description: { type: String, required: true, default: 'Nền tảng ôn tập thông minh trực tuyến' },
    allow_registration: { type: Boolean, required: true, default: true },
    maintenance_mode: { type: Boolean, required: true, default: false },
    anti_sharing_enabled: { type: Boolean, required: true, default: false },
    anti_sharing_max_violations: { type: Number, required: true, default: 10 },
  },
  { timestamps: false }
)

export const SiteSettings =
  mongoose.models.SiteSettings ??
  mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema)

/** Get or create the singleton settings document */
export async function getSettings(): Promise<ISiteSettings> {
  let settings = await SiteSettings.findOne().lean()
  if (!settings) {
    settings = await SiteSettings.create({})
  }
  return settings as ISiteSettings
}
