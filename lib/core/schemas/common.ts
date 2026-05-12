import { z } from 'zod'

// Improved regex patterns
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
export const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/
// Password must have at least 8 chars, 1 uppercase, 1 lowercase, 1 digit
// Allow common special characters
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

// Strip HTML tags to prevent XSS in stored text fields
export const stripHtml = (val: string) => val.replace(/<[^>]*>/g, '')

// ============================================
// QUERY PARAMS SCHEMAS
// ============================================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict()

export const SearchQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID').optional(),
  sort: z.enum(['newest', 'oldest', 'popular']).default('newest'),
}).strict()

export const PublicQuizzesQuerySchema = PaginationQuerySchema.extend({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID').optional(),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['newest', 'oldest', 'popular']).default('newest'),
}).strict()

export const SessionQuestionQuerySchema = z.object({
  question_index: z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? undefined : value),
    z.coerce.number().int().min(0).max(1000).optional()
  ),
})

export const QuizListQuerySchema = PaginationQuerySchema.extend({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID').optional(),
  search: z.string().trim().max(200).optional(),
}).strict()

export const UserListQuerySchema = PaginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  role: z.enum(['student', 'admin', '']).optional(),
  status: z.enum(['active', 'banned', '']).optional(),
}).strict()

export const CategoryListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  min_quizzes: z.coerce.number().int().min(0).max(1000).default(0),
  type: z.enum(['public', 'private', '']).optional(),
  status: z.enum(['pending', 'approved', 'rejected', '']).optional(),
}).strict()

// ============================================
// HELPER SCHEMAS & VALIDATORS
// ============================================

export const MongoIdSchema = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid MongoDB ObjectId')

export const validateObjectId = (id: string): boolean => {
  return MongoIdSchema.safeParse(id).success
}

export const ImageUploadSchema = z.object({
  image_url: z.string()
    .refine(val => {
      if (!val || !val.startsWith('data:image')) return true
      const sizeMatch = val.match(/^data:image\/[^;]+;base64,(.+)$/)
      if (!sizeMatch) return false
      const base64 = sizeMatch[1]
      const sizeInBytes = (base64.length * 3) / 4
      return sizeInBytes <= 5 * 1024 * 1024 // 5MB
    }, 'Image must be less than 5MB')
    .refine(val => {
      if (!val || !val.startsWith('data:image')) return true
      return /^data:image\/(jpeg|jpg|png|gif|webp)/.test(val)
    }, 'Only JPEG, PNG, GIF, WEBP allowed')
    .optional()
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
export type SearchQuery = z.infer<typeof SearchQuerySchema>
