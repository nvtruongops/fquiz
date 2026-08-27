import { z } from 'zod'

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict()

export const UserListQuerySchema = PaginationQuerySchema.extend({
  search: z.preprocess(v => v === null ? undefined : v, z.string().trim().max(200).optional()),
  role: z.enum(['student', 'teacher', 'admin', 'dev', '']).optional(),
  status: z.enum(['active', 'banned', 'pending_deletion', '']).optional(),
}).strict()

export const CategoryListQuerySchema = z.object({
  search: z.preprocess(v => v === null ? undefined : v, z.string().trim().max(200).optional()),
  min_quizzes: z.coerce.number().int().min(0).max(1000).default(0),
  type: z.enum(['public', 'private', '']).optional(),
  status: z.enum(['pending', 'approved', 'rejected', '']).optional(),
}).strict()

export const QuizListQuerySchema = PaginationQuerySchema.extend({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID').optional(),
  search: z.preprocess(v => v === null ? undefined : v, z.string().trim().max(200).optional()),
  status: z.enum(['draft', 'pending', 'published', 'archived', 'deleted', '']).optional(),
}).strict()

export const UpdateSiteSettingsSchema = z.object({
  app_name: z.string().min(1).max(100).optional(),
  app_description: z.string().max(500).optional(),
  allow_registration: z.boolean().optional(),
  maintenance_mode: z.boolean().optional(),
  anti_sharing_enabled: z.boolean().optional(),
  anti_sharing_max_violations: z.number().int().min(1).max(100).optional(),
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
