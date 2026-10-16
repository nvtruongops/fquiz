import { z } from 'zod'
import { stripHtml } from './common'

export const CategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name cannot be empty')
    .max(100, 'Category name cannot exceed 100 characters')
    .transform(stripHtml),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .transform(stripHtml)
    .optional(),
  slug: z.string().min(1, 'Slug cannot be empty').optional(),
})

export const CreateCategorySchema = CategorySchema.omit({ slug: true })

export const UpdateCategorySchema = CreateCategorySchema.partial()

export const CategoryActionSchema = z.object({
  ids: z.array(z.string().regex(/^[a-f0-9]{24}$/)),
  action: z.enum(['approve', 'reject', 'delete']),
  reason: z.string().max(500).optional(),
})

export const CategoryRequestSchema = z.object({
  name: z.string().min(1, 'Subject name cannot be empty').max(100),
  description: z.string().max(500).optional(),
  reason: z.string().min(1, 'Request reason cannot be empty').max(1000),
})

export type CategoryInput = z.infer<typeof CategorySchema>
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type CategoryRequestInput = z.infer<typeof CategoryRequestSchema>

export const CreateCategoryRequestSchema = CategoryRequestSchema
