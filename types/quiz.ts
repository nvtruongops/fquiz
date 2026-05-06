import { Types } from 'mongoose'

export interface IQuestion {
  _id: Types.ObjectId
  question_id?: string      // Optional: Content-based unique ID for deduplication
  text: string
  options: string[]
  correct_answer: number[]  // array to support multi-answer questions
  explanation?: string
  image_url?: string
}

export interface IQuiz {
  _id: Types.ObjectId
  title: string
  description?: string
  category_id: Types.ObjectId
  course_code: string
  questions?: IQuestion[]
  questionCount: number
  studentCount: number
  created_by?: Types.ObjectId
  created_at: Date
  status: 'published' | 'draft'
  is_public: boolean
  price?: number
  original_quiz_id?: Types.ObjectId
  is_saved_from_explore?: boolean
  is_temp?: boolean
  expires_at?: Date
  mix_config?: {
    quiz_ids: string[]
    question_count: number
    mode: 'immediate' | 'review'
    category_id: string
  }
}

export interface ICategory {
  _id: Types.ObjectId
  name: string
  owner_id?: Types.ObjectId // null for admin public categories
  is_public: boolean
  status: 'pending' | 'approved' | 'rejected'
  type: 'private' | 'public'
  created_at: Date
}

/**
 * UI Form representation of a question in the Editor
 */
export interface QuestionForm {
  text: string
  options: string[]
  correct_answers: number[] // multi-answer support
  explanation: string
  image_url: string
}

/**
 * UI Form representation of a Quiz in the Editor
 */
export interface QuizFormData {
  description: string
  category_id: string
  course_code: string
  questions: QuestionForm[]
  status: 'published' | 'draft'
}

/**
 * Basic Category data structure for UI select/list
 */
export interface Category {
  _id: string
  name: string
}
