import { Types } from 'mongoose'

export interface IQuestion {
  _id?: Types.ObjectId
  question_id?: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
}

export interface IQuestionStandalone {
  _id: Types.ObjectId
  question_id: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
  source_type: 'manual' | 'imported' | 'ai_generated'
  created_by?: Types.ObjectId
  created_at: Date
  updated_at: Date
  usage_count: number
  quiz_ids: Types.ObjectId[]
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
  questions: IQuestion[]
  question_refs: Types.ObjectId[]
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
  course_id?: Types.ObjectId
  language_id?: Types.ObjectId
  mix_config?: {
    quiz_ids: string[] | Types.ObjectId[]
    question_count: number
    mode: 'immediate' | 'review' | 'flashcard'
    category_id: string | Types.ObjectId
  }
  createdAt?: Date
  updatedAt?: Date
}

export interface ICategory {
  _id: Types.ObjectId
  name: string
  owner_id?: Types.ObjectId
  is_public: boolean
  status: 'pending' | 'approved' | 'rejected'
  type: 'private' | 'public'
  created_at: Date
}

export interface QuestionForm {
  text: string
  options: string[]
  correct_answers: number[]
  explanation: string
  image_url: string
}

export interface QuizFormData {
  description: string
  category_id: string
  course_code: string
  questions: QuestionForm[]
  status: 'published' | 'draft'
}

export interface ICategoryItem {
  _id: string
  name: string
}
