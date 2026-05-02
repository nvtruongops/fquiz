import { z } from 'zod'

// Improved regex patterns
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/
// Password must have at least 8 chars, 1 uppercase, 1 lowercase, 1 digit
// Allow common special characters
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export const RegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(30, 'Username tối đa 30 ký tự')
    .regex(USERNAME_REGEX, 'Username chỉ được chứa chữ, số và dấu _'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ')
    .regex(EMAIL_REGEX, 'Email không đúng định dạng'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(100, 'Mật khẩu tối đa 100 ký tự')
    .regex(PASSWORD_REGEX, 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
})

export const LoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email hoặc username')
    .max(100, 'Identifier quá dài'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .max(100, 'Mật khẩu quá dài'),
})

// Strip HTML tags to prevent XSS in stored text fields
const stripHtml = (val: string) => val.replace(/<[^>]*>/g, '')

export const QuestionSchema = z.object({
  question_id: z.string().optional(), // Auto-generated content-based ID
  text: z
    .string()
    .min(1, 'Câu hỏi không được để trống')
    .max(2000, 'Câu hỏi tối đa 2000 ký tự')
    .transform(stripHtml)
    .optional()
    .default(''),
  options: z
    .array(
      z.string()
        .min(1, 'Lựa chọn không được để trống')
        .max(500, 'Lựa chọn tối đa 500 ký tự')
        .transform(stripHtml)
    )
    .min(2, 'Cần ít nhất 2 lựa chọn')
    .max(10, 'Tối đa 10 lựa chọn')
    .optional()
    .default([]),
  correct_answer: z
    .array(z.number().int().min(0, 'Chỉ số đáp án phải >= 0'))
    .min(1, 'Phải có ít nhất 1 đáp án đúng')
    .optional()
    .default([]),
  explanation: z
    .string()
    .max(1000, 'Giải thích tối đa 1000 ký tự')
    .transform(stripHtml)
    .optional(),
  // image_url: base64 (new upload) or HTTPS URL (existing). Validated for type/size.
  image_url: z
    .string()
    .max(100000, 'URL hoặc base64 quá dài')
    .refine(
      (val) => {
        if (!val || !val.startsWith('data:image')) return true
        return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(val)
      },
      'Chỉ chấp nhận ảnh JPEG, PNG, GIF, WEBP'
    )
    .refine(
      (val) => {
        if (!val || !val.startsWith('data:image')) return true
        const match = val.match(/^data:image\/[^;]+;base64,(.+)$/)
        if (!match) return false
        return (match[1].length * 3) / 4 <= 5 * 1024 * 1024 // 5MB
      },
      'Ảnh không được vượt quá 5MB'
    )
    .refine(
      (val) => {
        if (!val || val.startsWith('data:image')) return true
        // Non-base64 must be a valid HTTPS URL
        return /^https:\/\/.+/.test(val)
      },
      'URL ảnh phải dùng HTTPS'
    )
    .optional(),
}).refine(
  (data) => {
    if (data.correct_answer && data.options) {
      return data.correct_answer.every((idx) => idx < data.options!.length)
    }
    return true
  },
  {
    message: 'Chỉ số đáp án đúng vượt quá số lượng lựa chọn',
    path: ['correct_answer'],
  }
)

// Lenient schema for draft saves — allows empty option strings and no correct answer
export const DraftQuestionSchema = z.object({
  question_id: z.string().optional(),
  text: z.string().max(2000).optional().default(''),
  options: z
    .array(z.string().max(500))
    .max(10)
    .optional()
    .default([]),
  correct_answer: z
    .array(z.number().int().min(0))
    .optional()
    .default([]),
  explanation: z.string().max(1000).optional(),
  image_url: z.string().max(100000).optional(),
})

export const CreateQuizSchema = z.object({
  description: z
    .string()
    .trim()
    .max(1000, 'Mô tả tối đa 1000 ký tự')
    .transform(stripHtml)
    .optional()
    .default(''),
  category_id: z
    .string()
    .min(1, 'Danh mục (Môn học) không được để trống')
    .regex(/^[a-f0-9]{24}$/, 'ID danh mục không hợp lệ'),
  course_code: z
    .string()
    .trim()
    .min(1, 'Mã đề / Mã Quiz không được để trống')
    .max(50, 'Mã đề tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã đề chỉ được chứa chữ cái, số và dấu gạch dưới (_)'),
  questions: z
    .array(QuestionSchema)
    .min(1, 'Cần ít nhất một câu hỏi')
    .max(150, 'Tối đa 150 câu hỏi'),
  status: z.enum(['published', 'draft']).optional().default('published'),
})

// Lenient schema for draft saves — skips per-option and correct_answer strictness
export const SaveDraftQuizSchema = z.object({
  description: z.string().trim().max(1000).transform(stripHtml).optional().default(''),
  category_id: z.string().min(1).regex(/^[a-f0-9]{24}$/, 'ID danh mục không hợp lệ'),
  course_code: z.string().trim().min(1, 'Mã đề không được để trống').max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã đề chỉ được chứa chữ cái, số và dấu gạch dưới (_)'),
  questions: z.array(DraftQuestionSchema).min(1).max(150),
  status: z.literal('draft'),
})

// Admin schemas — no upper limit on question count
export const AdminCreateQuizSchema = z.object({
  description: z
    .string()
    .trim()
    .max(1000, 'Mô tả tối đa 1000 ký tự')
    .transform(stripHtml)
    .optional()
    .default(''),
  category_id: z
    .string()
    .min(1, 'Danh mục (Môn học) không được để trống')
    .regex(/^[a-f0-9]{24}$/, 'ID danh mục không hợp lệ'),
  course_code: z
    .string()
    .trim()
    .min(1, 'Mã đề / Mã Quiz không được để trống')
    .max(50, 'Mã đề tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã đề chỉ được chứa chữ cái, số và dấu gạch dưới (_)'),
  questions: z
    .array(QuestionSchema)
    .min(1, 'Cần ít nhất một câu hỏi'),
  status: z.enum(['published', 'draft']).optional().default('published'),
})

// Admin lenient schema for draft saves — no upper limit on question count
export const AdminSaveDraftQuizSchema = z.object({
  description: z.string().trim().max(1000).transform(stripHtml).optional().default(''),
  category_id: z.string().min(1).regex(/^[a-f0-9]{24}$/, 'ID danh mục không hợp lệ'),
  course_code: z.string().trim().min(1, 'Mã đề không được để trống').max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã đề chỉ được chứa chữ cái, số và dấu gạch dưới (_)'),
  questions: z.array(DraftQuestionSchema).min(1),
  status: z.literal('draft'),
})

export const SubmitAnswerSchema = z
  .object({
    answer_index: z.number().int().min(0, 'answer_index must be a non-negative integer').optional(),
    answer_indexes: z
      .array(z.number().int().min(0, 'answer_indexes must contain non-negative integers'))
      .min(1, 'answer_indexes must contain at least one value')
      .optional(),
    question_index: z.number().int().min(0, 'question_index must be a non-negative integer').optional(),
  })
  .refine((data) => typeof data.answer_index === 'number' || (data.answer_indexes?.length ?? 0) > 0, {
    message: 'Either answer_index or answer_indexes is required',
    path: ['answer_indexes'],
  })

export const CreateHighlightSchema = z.object({
  question_id: z
    .string()
    .min(1, 'question_id is required')
    .regex(/^[a-f0-9]{24}$/, 'question_id không hợp lệ'),
  text_segment: z
    .string()
    .min(1, 'text_segment is required')
    .max(500, 'text_segment tối đa 500 ký tự'),
  color_code: z.enum(['#B0D4B8', '#D7F9FA', '#FFE082', '#EF9A9A'], {
    message: 'color_code must be one of the 4 allowed colors',
  }),
  offset: z
    .number()
    .int('offset phải là số nguyên')
    .min(0, 'offset must be a non-negative integer')
    .max(10000, 'offset quá lớn'),
})

export const UpdateProfileSchema = z.object({
  profile_bio: z
    .string()
    .trim()
    .max(300, 'Tiểu sử tối đa 300 ký tự')
    .optional(),
  avatar_url: z
    .string()
    .url('URL không hợp lệ')
    .regex(URL_REGEX, 'Ảnh đại diện phải là URL hợp lệ')
    .max(500, 'URL quá dài')
    .optional(),
})

export const UpdateStudentSettingsSchema = z.object({
  timezone: z.string().min(1, 'Múi giờ không được để trống').max(60, 'Múi giờ quá dài').optional(),
  language: z.enum(['vi', 'en']).optional(),
  notify_email: z.boolean().optional(),
  notify_quiz_reminder: z.boolean().optional(),
  privacy_share_activity: z.boolean().optional(),
})

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

// ============================================
// STUDENT SCHEMAS
// ============================================

export const CreateStudentQuizSchema = z.object({
  course_code: z.string().trim().min(1, 'Mã đề không được để trống').max(50, 'Mã đề tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã đề chỉ được chứa chữ cái, số và dấu gạch dưới (_)'),
  category_id: MongoIdSchema,
  description: z.string().trim().max(1000).transform(stripHtml).optional().default(''),
  questions: z.array(QuestionSchema).min(1, 'Cần ít nhất một câu hỏi').max(150, 'Tối đa 150 câu hỏi'),
})

export const SaveQuizSchema = z.object({
  quizId: MongoIdSchema.optional(),
  quiz_id: MongoIdSchema.optional(),
}).strict().refine((data) => Boolean(data.quizId || data.quiz_id), {
  message: 'quizId is required',
  path: ['quizId'],
}).transform((data) => ({
  quizId: data.quizId ?? data.quiz_id!,
}))

export const CreateCategoryRequestSchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100, 'Tên tối đa 100 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional(),
}).strict()

// ============================================
// ADMIN SCHEMAS
// ============================================

export const UpdateUserSchema = z.object({
  role: z.enum(['student', 'admin']).optional(),
  status: z.enum(['active', 'banned']).optional(),
  ban_reason: z.string().max(200).optional(),
}).strict()

export const BulkUserActionSchema = z.object({
  action: z.enum(['delete', 'ban', 'unban']),
  user_ids: z.array(MongoIdSchema).min(1, 'Cần ít nhất 1 user').max(100, 'Tối đa 100 users'),
}).strict()

export const UpdateSiteSettingsSchema = z.object({
  site_name: z.string().trim().min(1).max(100).optional(),
  site_description: z.string().trim().max(500).optional(),
  app_name: z.string().trim().min(1).max(100).optional(),
  app_description: z.string().trim().max(500).optional(),
  maintenance_mode: z.boolean().optional(),
  allow_registration: z.boolean().optional(),
  max_quiz_questions: z.number().int().min(1).max(500).optional(),
  session_timeout_minutes: z.number().int().min(5).max(1440).optional(),
  anti_sharing_enabled: z.boolean().optional(),
  anti_sharing_max_violations: z.number().int().min(1).max(100).optional(),
})

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100, 'Tên tối đa 100 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional(),
  is_public: z.boolean().default(true),
}).strict()

export const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  is_public: z.boolean().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
}).strict()

// Category status update schema
export const UpdateCategoryStatusSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    message: 'Status must be either approved or rejected',
  }),
}).strict()

// ============================================
// SESSION SCHEMAS
// ============================================

export const CreateSessionSchema = z.object({
  quiz_id: MongoIdSchema,
  mode: z.enum(['immediate', 'review', 'flashcard']).default('immediate'),
  difficulty: z.enum(['sequential', 'random']).default('sequential'),
  action: z.enum(['continue', 'restart']).optional(),
}).strict()

// ============================================
// TYPE EXPORTS
// ============================================

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type QuestionInput = z.infer<typeof QuestionSchema>
export type CreateQuizInput = z.infer<typeof CreateQuizSchema>
export type SaveDraftQuizInput = z.infer<typeof SaveDraftQuizSchema>
export type AdminCreateQuizInput = z.infer<typeof AdminCreateQuizSchema>
export type AdminSaveDraftQuizInput = z.infer<typeof AdminSaveDraftQuizSchema>
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>
export type CreateHighlightInput = z.infer<typeof CreateHighlightSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type UpdateStudentSettingsInput = z.infer<typeof UpdateStudentSettingsSchema>
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
export type SearchQuery = z.infer<typeof SearchQuerySchema>
export type CreateStudentQuizInput = z.infer<typeof CreateStudentQuizSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type BulkUserActionInput = z.infer<typeof BulkUserActionSchema>
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>
