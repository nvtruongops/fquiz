import { Types } from 'mongoose'
import type { IQuestion } from './quiz'

export interface UserAnswer {
  question_index: number
  answer_index: number
  answer_indexes?: number[]
  is_correct: boolean
}

export interface IQuizSession {
  _id: Types.ObjectId
  student_id: Types.ObjectId
  quiz_id: Types.ObjectId
  mode: 'immediate' | 'review'
  difficulty: 'sequential' | 'random' // sequential = theo thứ tự, random = xáo trộn
  status: 'active' | 'completed'
  user_answers: UserAnswer[]
  current_question_index: number
  question_order: number[] // Array of original question indices in shuffled order
  questions_cache?: IQuestion[] // Cached questions to avoid DB query on every answer
  score: number
  expires_at: Date
  started_at: Date
  completed_at?: Date
  last_activity_at?: Date
  paused_at?: Date
  total_paused_duration_ms?: number // Total time spent paused in milliseconds
}
