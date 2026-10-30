import { z } from 'zod'
import { stripHtml, MongoIdSchema } from './common'
import { getExplicitAnswerSelectionCount } from '../utils/question-selection-helper'

export const COURSE_CODE_MAX_LENGTH = 150
export const COURSE_CODE_MAX_LENGTH_MESSAGE = `Course code / Quiz code cannot exceed ${COURSE_CODE_MAX_LENGTH} characters`
export const COURSE_CODE_ALLOWED_MESSAGE = 'Course code / Quiz code can only contain letters, numbers, spaces, underscores (_), colons (:), and hyphens (-)'
export const COURSE_CODE_PATTERN = /^[a-zA-Z0-9_ :ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỂưạảấầẩẫậắằẳẵặẹẻẽềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴÝỶỸỳỵỷỹ-]+$/

export const QuestionSchema = z.object({
  question_id: z.string().optional(),
  text: z
    .string()
    .min(1, 'Question text cannot be empty')
    .max(10000, 'Question text cannot exceed 10000 characters')
    .transform(stripHtml)
    .optional()
    .default(''),
  options: z
    .array(
      z.string()
        .min(1, 'Option text cannot be empty')
        .max(500, 'Option text cannot exceed 500 characters')
        .transform(stripHtml)
    )
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed')
    .optional()
    .default([]),
  correct_answer: z
    .union([z.number().int().min(0, 'Answer index must be >= 0'), z.array(z.number().int().min(0, 'Answer index must be >= 0'))])
    .optional()
    .default([]),
  explanation: z
    .string()
    .max(1000, 'Explanation cannot exceed 1000 characters')
    .transform(stripHtml)
    .optional(),
  image_url: z
    .string()
    .max(100000, 'URL or base64 is too long')
    .refine(
      (val) => {
        if (!val || !val.startsWith('data:image')) return true
        return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(val)
      },
      'Only JPEG, PNG, GIF, and WEBP images are supported'
    )
    .refine(
      (val) => {
        if (!val || !val.startsWith('data:image')) return true
        const match = val.match(/^data:image\/[^;]+;base64,(.+)$/)
        if (!match) return false
        return (match[1].length * 3) / 4 <= 5 * 1024 * 1024
      },
      'Image cannot exceed 5MB'
    )
    .refine(
      (val) => {
        if (!val || !val.startsWith('data:image')) return true
        return /^https:\/\/.+/.test(val)
      },
      'Image URL must use HTTPS'
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
    message: 'Correct answer index exceeds the number of options',
    path: ['correct_answer'],
  }
).refine(
  (data) => {
    const requestedCount = getExplicitAnswerSelectionCount(data.text)
    if (requestedCount === null) return true
    const answers = Array.isArray(data.correct_answer) ? data.correct_answer : [data.correct_answer]
    return answers.length === requestedCount
  },
  {
    message: 'Correct answer count must match the number requested in the question text',
    path: ['correct_answer'],
  }
)

export const DraftQuestionSchema = z.object({
  question_id: z.string().optional(),
  text: z.string().max(10000).optional().default(''),
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
    .max(1000, 'Description cannot exceed 1000 characters')
    .transform(stripHtml)
    .optional()
    .default(''),
  category_id: z
    .string()
    .min(1, 'Category (Subject) cannot be empty')
    .regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z
    .string()
    .trim()
    .min(1, 'Course code / Quiz code cannot be empty')
    .max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
  questions: z
    .array(QuestionSchema)
    .min(1, 'At least one question is required')
    .max(150, 'Maximum 150 questions allowed'),
  status: z.enum(['published', 'draft']).optional().default('published'),
})

export const SaveDraftQuizSchema = z.object({
  description: z.string().trim().max(1000).transform(stripHtml).optional().default(''),
  category_id: z.string().min(1).regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z.string().trim().min(1, 'Course code cannot be empty').max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
  questions: z.array(DraftQuestionSchema).min(1).max(150),
  status: z.literal('draft'),
})

export const AdminCreateQuizSchema = z.object({
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .transform(stripHtml)
    .optional()
    .default(''),
  category_id: z
    .string()
    .min(1, 'Category (Subject) cannot be empty')
    .regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z
    .string()
    .trim()
    .min(1, 'Course code / Quiz code cannot be empty')
    .max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
  questions: z
    .array(QuestionSchema)
    .min(1, 'At least one question is required'),
  status: z.enum(['published', 'draft']).optional().default('published'),
})

export const AdminSaveDraftQuizSchema = z.object({
  description: z.string().trim().max(1000).transform(stripHtml).optional().default(''),
  category_id: z.string().min(1).regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z.string().trim().min(1, 'Course code cannot be empty').max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
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
  course_code: z.string().trim().min(1, 'Course code cannot be empty').max(COURSE_CODE_MAX_LENGTH, COURSE_CODE_MAX_LENGTH_MESSAGE)
    .regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
  category_id: MongoIdSchema,
  description: z.string().trim().max(1000).transform(stripHtml).optional().default(''),
  questions: z.array(QuestionSchema).min(1, 'At least one question is required').max(150, 'Maximum 150 questions allowed'),
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
