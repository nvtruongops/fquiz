import { z } from 'zod'
import { stripHtml, MongoIdSchema } from '@/lib/core/schemas/common'

export const COURSE_CODE_MAX_LENGTH = 150
export const COURSE_CODE_MAX_LENGTH_MESSAGE = `Mã môn / Mã đề tối đa ${COURSE_CODE_MAX_LENGTH} ký tự`
export const COURSE_CODE_ALLOWED_MESSAGE = 'Mã môn / Mã đề chỉ được chứa chữ cái, số, dấu cách, dấu gạch dưới (_), dấu hai chấm (:) và dấu gạch ngang (-)'
export const COURSE_CODE_PATTERN = /^[a-zA-Z0-9_ :ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴÝỶỸửữựỳỵỷỹ-]+$/

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
    .union([z.number().int().min(0, 'Chỉ số đáp án phải >= 0'), z.array(z.number().int().min(0, 'Chỉ số đáp án phải >= 0'))])
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
      const answers = Array.isArray(data.correct_answer) ? data.correct_answer : [data.correct_answer]
      return answers.every((idx: number) => idx < data.options!.length)
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
    .max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
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
  course_code: z.string().trim().min(1, 'Mã đề không được để trống').max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
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
    .max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
  questions: z
    .array(QuestionSchema)
    .min(1, 'Cần ít nhất một câu hỏi'),
  status: z.enum(['published', 'draft']).optional().default('published'),
})

// Admin lenient schema for draft saves — no upper limit on question count
export const AdminSaveDraftQuizSchema = z.object({
  description: z.string().trim().max(1000).transform(stripHtml).optional().default(''),
  category_id: z.string().min(1).regex(/^[a-f0-9]{24}$/, 'ID danh mục không hợp lệ'),
  course_code: z.string().trim().min(1, 'Mã đề không được để trống').max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
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

export const CreateStudentQuizSchema = z.object({
  course_code: z.string().trim().min(1, 'Mã đề không được để trống').max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
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

// ============================================
// SESSION SCHEMAS
// ============================================

export const CreateSessionSchema = z.object({
  quiz_id: MongoIdSchema,
  mode: z.enum(['immediate', 'review', 'flashcard']).default('immediate'),
  difficulty: z.enum(['sequential', 'random']).default('sequential'),
  shuffle_options: z.boolean().optional(),
  action: z.enum(['continue', 'restart']).optional(),
}).strict()


export type QuestionInput = z.infer<typeof QuestionSchema>
export type CreateQuizInput = z.infer<typeof CreateQuizSchema>
export type SaveDraftQuizInput = z.infer<typeof SaveDraftQuizSchema>
export type AdminCreateQuizInput = z.infer<typeof AdminCreateQuizSchema>
export type AdminSaveDraftQuizInput = z.infer<typeof AdminSaveDraftQuizSchema>
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>
export type CreateStudentQuizInput = z.infer<typeof CreateStudentQuizSchema>
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>

// ============================================
// QUESTION BANK INPUT SCHEMA
// Lenient schema for question bank sync/check endpoints
// ============================================
export const QuestionInputSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string()).min(2),
  correct_answer: z.array(z.number().int().min(0)),
  explanation: z.string().optional(),
  image_url: z.string().optional(),
})

export type QuestionBankInput = z.infer<typeof QuestionInputSchema>

export const SyncQuizSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z.string().trim().min(1).max(COURSE_CODE_MAX_LENGTH).regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
  quiz_id: z.string().optional(),
  questions: z.array(QuestionInputSchema).min(1)
})

export const CheckQuestionsSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  questions: z.array(QuestionInputSchema).min(1)
})

