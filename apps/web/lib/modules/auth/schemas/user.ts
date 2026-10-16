import { z } from 'zod'
import { stripHtml } from '@/lib/core/schemas/common'

export const UpdateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  display_name: z
    .string()
    .max(50, 'Display name cannot exceed 50 characters')
    .transform(stripHtml)
    .optional(),
  profile_bio: z
    .string()
    .max(200, 'Bio cannot exceed 200 characters')
    .transform(stripHtml)
    .optional(),
  avatar_url: z.string().url('Invalid image URL').optional().or(z.literal('')),
  role: z.enum(['student', 'teacher', 'admin', 'dev']).optional(),
  status: z.enum(['active', 'banned']).optional(),
  ban_reason: z.string().max(200).optional(),
})

export const UpdateStudentSettingsSchema = z.object({
  timezone: z.string().optional(),
  language: z.enum(['vi', 'en']).optional(),
  notify_email: z.boolean().optional(),
  notify_quiz_reminder: z.boolean().optional(),
  privacy_share_activity: z.boolean().optional(),
})

export const BulkUserActionSchema = z.object({
  user_ids: z.array(z.string().regex(/^[a-f0-9]{24}$/)),
  action: z.enum(['ban', 'unban', 'set_student', 'set_teacher', 'set_admin', 'set_dev', 'delete']),
  reason: z.string().max(200).optional(),
})

export const UpdateSiteSettingsSchema = z.object({
  app_name: z.string().max(100).optional(),
  app_description: z.string().max(500).optional(),
  maintenance_mode: z.boolean().optional(),
  allow_registration: z.boolean().optional(),
  anti_sharing_enabled: z.boolean().optional(),
  anti_sharing_max_violations: z.number().int().min(1).optional(),
  google_auth_enabled: z.boolean().optional(),
  site_name: z.string().max(100).optional(),
  contact_email: z.string().email().optional(),
  llm_config: z.object({
    active_provider: z.enum(['openai', 'gemini', 'custom']).optional(),
    openai: z.object({
      apiKey: z.string().optional(),
      model: z.string().optional(),
    }).optional(),
    gemini: z.object({
      apiKey: z.string().optional(),
      model: z.string().optional(),
    }).optional(),
    custom: z.object({
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    }).optional(),
  }).optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type UpdateStudentSettingsInput = z.infer<typeof UpdateStudentSettingsSchema>
export type BulkUserActionInput = z.infer<typeof BulkUserActionSchema>
export type UpdateSiteSettingsInput = z.infer<typeof UpdateSiteSettingsSchema>

// Aliases for backward compatibility
export const UpdateProfileSchema = UpdateUserSchema
export type UpdateProfileInput = UpdateUserInput
