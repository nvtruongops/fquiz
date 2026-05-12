import { z } from 'zod'
import { stripHtml } from '@/lib/core/schemas/common'

export const CategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Tên danh mục không được để trống')
    .max(100, 'Tên danh mục tối đa 100 ký tự')
    .transform(stripHtml),
  description: z
    .string()
    .max(500, 'Mô tả tối đa 500 ký tự')
    .transform(stripHtml)
    .optional(),
  slug: z.string().min(1, 'Slug không được để trống').optional(),
})

export const CreateCategorySchema = CategorySchema.omit({ slug: true })

export const UpdateCategorySchema = CreateCategorySchema.partial()

export const CategoryActionSchema = z.object({
  ids: z.array(z.string().regex(/^[a-f0-9]{24}$/)),
  action: z.enum(['approve', 'reject', 'delete']),
  reason: z.string().max(500).optional(),
})

export const CategoryRequestSchema = z.object({
  name: z.string().min(1, 'Tên môn học không được để trống').max(100),
  description: z.string().max(500).optional(),
  reason: z.string().min(1, 'Lý do yêu cầu không được để trống').max(1000),
})

export type CategoryInput = z.infer<typeof CategorySchema>
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type CategoryRequestInput = z.infer<typeof CategoryRequestSchema>

// Aliases for backward compatibility
export const CreateCategoryRequestSchema = CategoryRequestSchema
