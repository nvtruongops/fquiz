import { z } from 'zod'

export const createClassroomSchema = z.object({
  name: z.string().trim().min(2, 'Tên lớp học phải có ít nhất 2 ký tự').max(100, 'Tên lớp tối đa 100 ký tự'),
  password: z.string().trim().max(50, 'Mật khẩu tối đa 50 ký tự').optional().or(z.literal('')),
  description: z.string().max(1000, 'Mô tả tối đa 1000 ký tự').optional(),
  cover_image: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
})

export const updateClassroomSchema = createClassroomSchema.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
  settings: z
    .object({
      allow_code_join: z.boolean().optional(),
    })
    .optional(),
})

export const joinClassroomSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(6, 'Mã lớp phải gồm đúng 6 ký tự'),
  password: z.string().trim().optional().or(z.literal('')),
})

export const createQuizAssignmentSchema = z.object({
  classroom_id: z.string().min(1, 'Vui lòng chọn lớp học'),
  quiz_id: z.string().min(1, 'Vui lòng chọn bộ đề Quiz'),
  title: z.string().trim().min(2, 'Tiêu đề bài tập ít nhất 2 ký tự'),
  description: z.string().optional(),
  start_at: z.string().datetime().optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
  time_limit_minutes: z.number().min(0).default(0),
  max_attempts: z.number().min(0).default(0),
  pass_score_percent: z.number().min(0).max(100).default(70),
  show_answers_immediately: z.boolean().default(true),
})

export type CreateClassroomInput = z.infer<typeof createClassroomSchema>
export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>
export type JoinClassroomInput = z.infer<typeof joinClassroomSchema>
export type CreateQuizAssignmentInput = z.infer<typeof createQuizAssignmentSchema>
