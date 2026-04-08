import { Types } from 'mongoose'

export interface IQuestion {
  _id: Types.ObjectId
  text: string
  options: string[]
  correct_answer: number[]  // array to support multi-answer questions
  explanation?: string
  image_url?: string
}

export interface IQuiz {
  _id: Types.ObjectId
  title: string
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
