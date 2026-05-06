import { Types } from 'mongoose'
import type { IQuestion } from './quiz'

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
  student_id: Types.ObjectId
  quiz_id: Types.ObjectId
  mode: 'immediate' | 'review' | 'flashcard'
  difficulty: 'sequential' | 'random' // sequential = theo thứ tự, random = xáo trộn
  status: 'active' | 'completed'
  user_answers: UserAnswer[]
  current_question_index: number
  question_order: number[] // Array of original question indices in shuffled order
  questions_cache?: IQuestion[] // Cached questions to avoid DB query on every answer
  score: number
  flashcard_stats?: FlashcardStats // Statistics for flashcard mode
  expires_at?: Date
  started_at: Date
  completed_at?: Date
  last_activity_at?: Date
  paused_at?: Date
  total_paused_duration_ms?: number // Total time spent paused in milliseconds
  is_temp?: boolean
}

/**
 * Feedback for a question after submission in a session
 */
export interface QuestionFeedback {
  isCorrect: boolean
  correctAnswer: number
  correctAnswers?: number[]
  explanation?: string
}

/**
 * Representation of a question within a quiz session
 */
export interface SessionQuestion {
  _id: string
  text: string
  options: string[]
  answer_selection_count?: number
  image_url?: string
  correct_answer?: number | number[]
  explanation?: string
}

/**
 * Core session data from API for UI consumption
 */
export interface SessionData {
  session: {
    _id: string
    mode: 'immediate' | 'review' | 'flashcard'
    status: 'active' | 'completed'
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

/**
 * Preloaded batch of questions for a session
 */
export interface PreloadedQuestions {
  sessionId: string
  mode: 'immediate' | 'review' | 'flashcard'
  status: 'active' | 'completed'
  totalQuestions: number
  questions: SessionQuestion[]
}
