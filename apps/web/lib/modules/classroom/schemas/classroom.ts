import { z } from 'zod'

export const createClassroomSchema = z.object({
  name: z.string().trim().min(2, 'Classroom name must be at least 2 characters').max(100, 'Classroom name cannot exceed 100 characters'),
  password: z.string().trim().max(50, 'Password cannot exceed 50 characters').optional().or(z.literal('')),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  cover_image: z.string().url('Invalid image URL').optional().or(z.literal('')),
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
    .length(6, 'Class code must be exactly 6 characters'),
  password: z.string().trim().optional().or(z.literal('')),
})

export const createQuizAssignmentSchema = z.object({
  classroom_id: z.string().min(1, 'Please select a classroom'),
  quiz_id: z.string().min(1, 'Please select a quiz'),
  title: z.string().trim().min(2, 'Assignment title must be at least 2 characters'),
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
