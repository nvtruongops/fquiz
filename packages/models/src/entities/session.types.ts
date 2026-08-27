import { Types } from 'mongoose'
import type { IQuestion } from './quiz.types'

export interface UserAnswer {
  question_index: number
  answer_index: number
  answer_indexes?: number[]
  is_correct: boolean
}

export interface FlashcardStats {
  total_cards: number
  cards_known: number
  cards_unknown: number
  time_spent_ms: number
  current_round: number
}

export interface IQuizSession {
  _id: Types.ObjectId
  student_id?: Types.ObjectId | null
  is_guest?: boolean
  guest_id?: string
  quiz_id?: Types.ObjectId
  mode: 'immediate' | 'review' | 'flashcard'
  difficulty: 'sequential' | 'random'
  status: 'preparing' | 'active' | 'completed' | 'paused' | 'expired'
  user_answers: UserAnswer[]
  current_question_index: number
  question_order: number[]
  question_ids: Types.ObjectId[]
  questions_cache?: IQuestion[]
  score: number
  flashcard_stats?: FlashcardStats
  expires_at?: Date
  started_at: Date
  completed_at?: Date
  last_activity_at?: Date
  paused_at?: Date
  total_paused_duration_ms?: number
  is_temp?: boolean
  answer_version?: number
  assignment_id?: Types.ObjectId
  classroom_id?: Types.ObjectId
}

export interface QuestionFeedback {
  isCorrect: boolean
  correctAnswer: number
  correctAnswers?: number[]
  explanation?: string
}

export interface SessionQuestion {
  _id: string
  text: string
  options: string[]
  answer_selection_count?: number
  image_url?: string
  correct_answer?: number | number[]
  explanation?: string
  usage_count?: number
  used_in_quizzes?: string[]
}

export interface SessionData {
  session: {
    _id: string
    mode: 'immediate' | 'review' | 'flashcard'
    status: 'preparing' | 'active' | 'completed' | 'paused' | 'expired'
    current_question_index: number
    user_answers: UserAnswer[]
    score: number
    totalQuestions: number
    courseCode: string
    categoryName: string
    title: string
    started_at: string
    paused_at?: string | null
    total_paused_duration_ms?: number
    is_temp?: boolean
  }
  question: SessionQuestion
}

export interface PreloadedQuestions {
  sessionId: string
  mode: 'immediate' | 'review' | 'flashcard'
  status: 'preparing' | 'active' | 'completed' | 'paused' | 'expired'
  totalQuestions: number
  questions: SessionQuestion[]
}
