import { z } from 'zod'
import { stripHtml } from '@/lib/core/schemas/common'

export const UpdateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(20, 'Tên đăng nhập tối đa 20 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới')
    .optional(),
  display_name: z
    .string()
    .max(50, 'Tên hiển thị tối đa 50 ký tự')
    .transform(stripHtml)
    .optional(),
  profile_bio: z
    .string()
    .max(200, 'Giới thiệu tối đa 200 ký tự')
    .transform(stripHtml)
    .optional(),
  avatar_url: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
  role: z.enum(['student', 'admin']).optional(),
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
  action: z.enum(['ban', 'unban', 'set_student', 'set_admin', 'delete']),
  reason: z.string().max(200).optional(),
})

export const UpdateSiteSettingsSchema = z.object({
  maintenance_mode: z.boolean().optional(),
  registration_enabled: z.boolean().optional(),
  anti_sharing_enabled: z.boolean().optional(),
  anti_sharing_max_violations: z.number().int().min(1).optional(),
  google_auth_enabled: z.boolean().optional(),
  site_name: z.string().max(100).optional(),
  contact_email: z.string().email().optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type UpdateStudentSettingsInput = z.infer<typeof UpdateStudentSettingsSchema>
export type BulkUserActionInput = z.infer<typeof BulkUserActionSchema>
export type UpdateSiteSettingsInput = z.infer<typeof UpdateSiteSettingsSchema>

// Aliases for backward compatibility
export const UpdateProfileSchema = UpdateUserSchema
export type UpdateProfileInput = UpdateUserInput
