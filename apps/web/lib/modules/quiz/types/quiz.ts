import { Types } from 'mongoose'

/**
 * Embedded question sub-document inside Quiz (legacy, kept for backward compat).
 */
export interface IQuestion {
  _id: Types.ObjectId
  question_id?: string      // Optional: Content-based unique ID for deduplication
  text: string
  options: string[]
  correct_answer: number | number[]  // single for backward compat, array for multi-answer
  explanation?: string
  image_url?: string
}

/**
 * Standalone Question document (new collection – Phase 1).
 * Tách biệt khỏi Quiz để tái sử dụng và liên kết với Learning Objects.
 */
export interface IQuestionStandalone {
  _id: Types.ObjectId
  question_id: string                // Content-based unique ID (required)
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string

  // Metadata
  source_type: 'manual' | 'imported' | 'ai_generated'
  created_by?: Types.ObjectId
  created_at: Date
  updated_at: Date

  // Usage tracking
  usage_count: number
  quiz_ids: Types.ObjectId[]        // Các Quiz tham chiếu đến câu hỏi này

  // Learning links (Phase 2 – Double-Write, temporary)
  // Phase 4+: thay bằng QuestionContentRelation JOIN TABLE
  vocabulary_ids?: Types.ObjectId[]
  grammar_ids?: Types.ObjectId[]
  sentence_ids?: Types.ObjectId[]
  language_id?: Types.ObjectId
  ai_asset_id?: Types.ObjectId
}

export interface IQuiz {
  _id: Types.ObjectId
  title: string
  description?: string
  category_id: Types.ObjectId
  course_code: string
  questions: IQuestion[]              // Legacy: embedded questions (Double-Write Phase 1)
  question_refs: Types.ObjectId[]     // New: references to standalone Question documents
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
  // Phase 2 Learning Links (Double-Write, optional)
  course_id?: Types.ObjectId
  language_id?: Types.ObjectId
  mix_config?: {
    quiz_ids: string[]
    question_count: number
    mode: 'immediate' | 'review'
    category_id: string
  }
  createdAt?: Date
  updatedAt?: Date
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
