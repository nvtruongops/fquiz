import { Types } from 'mongoose'

export interface IClassroom {
  _id: Types.ObjectId
  name: string
  code: string
  password?: string | null
  description?: string
  teacher_id: Types.ObjectId
  cover_image?: string
  status: 'active' | 'archived'
  student_count: number
  settings?: {
    allow_code_join?: boolean
  }
  created_at: Date
  updated_at?: Date
}

export interface IClassroomMember {
  _id: Types.ObjectId
  classroom_id: Types.ObjectId
  student_id: Types.ObjectId
  joined_at: Date
  status: 'active' | 'blocked'
  is_pinned?: boolean
  is_starred?: boolean
  tags?: string[]
}

export interface IQuizAssignment {
  _id: Types.ObjectId
  classroom_id: Types.ObjectId
  quiz_id: Types.ObjectId
  teacher_id: Types.ObjectId
  title: string
  description?: string
  start_at?: Date | null
  due_at?: Date | null
  time_limit_minutes?: number
  max_attempts?: number
  pass_score_percent?: number
  show_answers_immediately?: boolean
  status: 'draft' | 'published' | 'closed'
  created_at: Date
}

export interface IQuizAssignmentProgress {
  _id: Types.ObjectId
  assignment_id: Types.ObjectId
  classroom_id: Types.ObjectId
  student_id: Types.ObjectId
  latest_session_id?: Types.ObjectId | null
  best_score: number
  attempts_count: number
  is_passed: boolean
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
  submitted_at?: Date | null
  created_at: Date
  updated_at?: Date
}
